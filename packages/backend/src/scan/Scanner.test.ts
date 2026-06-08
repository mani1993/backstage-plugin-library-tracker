import { UrlReaderService } from '@backstage/backend-plugin-api';
import { mockServices } from '@backstage/backend-test-utils';
import { Entity } from '@backstage/catalog-model';
import { NotModifiedError } from '@backstage/errors';
import { ScanStatus } from 'backstage-plugin-library-tracker-common';
import { EntitySource } from '../catalog/EntitySource';
import { RegistryClient } from '../registry';
import { LibraryTrackerStore, ScannedDependency } from '../store';
import { Scanner } from './Scanner';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'orders',
    namespace: 'default',
    annotations: { 'backstage.io/source-location': 'url:https://github.com/acme/orders/tree/main/' },
  },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

/** Minimal store capturing what the scanner writes. */
class FakeStore implements Partial<LibraryTrackerStore> {
  status?: ScanStatus;
  saved?: ScannedDependency[];
  async getStatus() {
    return this.status;
  }
  async upsertStatus(status: ScanStatus) {
    this.status = status;
  }
  async replaceEntityDependencies(_ref: string, deps: ScannedDependency[]) {
    this.saved = deps;
  }
  async insertRun() {}
  async updateRun() {}
}

const entities: EntitySource = {
  listComponents: async () => [entity],
  getEntity: async () => entity,
};

const registry: RegistryClient = {
  fetchInfo: async () => ({ latestVersion: '4.17.21', license: 'MIT' }),
};

/** Reader that serves a tiny repo, and reports "not modified" when given a known etag. */
function fakeReader(knownEtag?: string): UrlReaderService {
  return {
    readTree: jest.fn(async (_url: string, options?: { etag?: string }) => {
      if (knownEtag && options?.etag === knownEtag) throw new NotModifiedError();
      return {
        etag: 'etag-v2',
        files: async () => [
          { path: 'package.json', content: async () => Buffer.from(JSON.stringify({ dependencies: { lodash: '^4.0.0', 'left-pad': '^1.0.0' } })) },
          { path: 'src/index.ts', content: async () => Buffer.from(`import _ from 'lodash';`) },
        ],
      };
    }),
  } as unknown as UrlReaderService;
}

function makeScanner(store: FakeStore, reader: UrlReaderService) {
  return new Scanner({ reader, registry, store: store as unknown as LibraryTrackerStore, entities, logger: mockServices.logger.mock() });
}

describe('Scanner', () => {
  it('builds enriched dependency records with usage and drift', async () => {
    const store = new FakeStore();
    const run = await makeScanner(store, fakeReader()).scanAll();

    expect(run).toMatchObject({ scanned: 1, skipped: 0, failed: 0 });
    const byName = Object.fromEntries((store.saved ?? []).map(d => [d.record.name, d]));

    expect(byName.lodash.record).toMatchObject({
      used: true,
      unused: false,
      latestVersion: '4.17.21',
      license: 'MIT',
      driftSeverity: 'minor',
      owner: 'team-a',
    });
    expect(byName.lodash.occurrences).toEqual([{ path: 'src/index.ts', line: 1 }]);

    // Declared but never imported -> flagged unused (npm absence is high-confidence).
    expect(byName['left-pad'].record).toMatchObject({ used: false, unused: true });
    expect(store.status).toMatchObject({ lastOutcome: 'ok', lastEtag: 'etag-v2' });
  });

  it('skips repositories with no new commits since last sync', async () => {
    const store = new FakeStore();
    store.status = { entityRef: 'component:default/orders', lastOutcome: 'ok', lastEtag: 'etag-old' };
    const reader = fakeReader('etag-old');

    const run = await makeScanner(store, reader).scanAll();

    expect(run).toMatchObject({ scanned: 0, skipped: 1 });
    expect(store.saved).toBeUndefined(); // nothing re-analysed
    expect(store.status).toMatchObject({ lastOutcome: 'skipped', lastEtag: 'etag-old' });
  });
});
