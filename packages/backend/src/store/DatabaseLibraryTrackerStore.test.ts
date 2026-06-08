import { DatabaseService } from '@backstage/backend-plugin-api';
import { TestDatabases } from '@backstage/backend-test-utils';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';
import { DatabaseLibraryTrackerStore } from './DatabaseLibraryTrackerStore';
import { ScannedDependency } from './types';

/** Build a dependency record with sensible defaults for the fields a test doesn't care about. */
function dep(partial: Partial<DependencyRecord> & Pick<DependencyRecord, 'entityRef' | 'name'>): ScannedDependency {
  const record: DependencyRecord = {
    id: `${partial.entityRef}|${partial.manifestPath ?? 'package.json'}|${partial.ecosystem ?? 'npm'}|${partial.name}`,
    entityRef: partial.entityRef,
    owner: partial.owner,
    ecosystem: partial.ecosystem ?? 'npm',
    manifestPath: partial.manifestPath ?? 'package.json',
    name: partial.name,
    declaredVersion: partial.declaredVersion ?? '1.0.0',
    scope: partial.scope ?? 'prod',
    license: partial.license,
    latestVersion: partial.latestVersion,
    driftSeverity: partial.driftSeverity ?? 'up-to-date',
    used: partial.used ?? true,
    confidence: partial.confidence ?? 0.9,
    unused: partial.unused ?? false,
  };
  return { record, occurrences: partial.used === false ? [] : [{ path: 'src/index.ts', line: 3 }] };
}

describe('DatabaseLibraryTrackerStore', () => {
  const databases = TestDatabases.create();

  async function createStore() {
    const knex = await databases.init('SQLITE_3');
    return DatabaseLibraryTrackerStore.create({ getClient: async () => knex } as DatabaseService);
  }

  it('stores and lists dependencies, and replace is idempotent', async () => {
    const store = await createStore();
    await store.replaceEntityDependencies('component:default/a', [
      dep({ entityRef: 'component:default/a', name: 'lodash', owner: 'team-a' }),
      dep({ entityRef: 'component:default/a', name: 'left-pad', used: false, unused: true }),
    ]);

    let listed = await store.listEntityDependencies('component:default/a');
    expect(listed.map(d => d.name).sort()).toEqual(['left-pad', 'lodash']);

    // Re-scanning with fewer deps replaces, not appends.
    await store.replaceEntityDependencies('component:default/a', [
      dep({ entityRef: 'component:default/a', name: 'lodash', owner: 'team-a' }),
    ]);
    listed = await store.listEntityDependencies('component:default/a');
    expect(listed.map(d => d.name)).toEqual(['lodash']);
  });

  it('supports reverse search, duplicates, unused, outdated and occurrences', async () => {
    const store = await createStore();
    await store.replaceEntityDependencies('component:default/a', [
      dep({ entityRef: 'component:default/a', name: 'lodash', declaredVersion: '4.17.0', latestVersion: '4.17.21', driftSeverity: 'patch', owner: 'team-a' }),
      dep({ entityRef: 'component:default/a', name: 'unused-lib', used: false, unused: true, confidence: 0.9 }),
    ]);
    await store.replaceEntityDependencies('component:default/b', [
      dep({ entityRef: 'component:default/b', name: 'lodash', declaredVersion: '3.10.0', driftSeverity: 'major', owner: 'team-b' }),
    ]);

    const library = await store.getLibrary('lodash');
    expect(library?.entityCount).toBe(2);
    expect(library?.versions.sort()).toEqual(['3.10.0', '4.17.0']);

    const duplicates = await store.duplicateVersions();
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toMatchObject({ name: 'lodash', versionCount: 2 });

    expect((await store.listUnused()).map(d => d.name)).toEqual(['unused-lib']);
    expect((await store.listOutdated()).map(d => d.name).sort()).toEqual(['lodash', 'lodash']);
    expect((await store.listOutdated('major')).map(d => d.entityRef)).toEqual(['component:default/b']);

    const occurrences = await store.getOccurrences('lodash', 'component:default/a');
    expect(occurrences).toEqual([
      { entityRef: 'component:default/a', manifestPath: 'package.json', occurrences: [{ path: 'src/index.ts', line: 3 }] },
    ]);

    const filtered = await store.listDependencies({ owner: 'team-b' });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].entityRef).toBe('component:default/b');
  });

  it('upserts status and records runs', async () => {
    const store = await createStore();
    await store.upsertStatus({ entityRef: 'component:default/a', lastOutcome: 'ok', lastEtag: 'etag-1' });
    await store.upsertStatus({ entityRef: 'component:default/a', lastOutcome: 'skipped', lastEtag: 'etag-1' });

    const status = await store.getStatus('component:default/a');
    expect(status).toMatchObject({ lastOutcome: 'skipped', lastEtag: 'etag-1' });

    await store.insertRun({ id: 'run-1', trigger: 'manual', startedAt: '2026-01-01T00:00:00Z', scanned: 0, skipped: 0, failed: 0 });
    await store.updateRun({ id: 'run-1', trigger: 'manual', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:00Z', scanned: 5, skipped: 1, failed: 0, summary: 'done' });

    const runs = await store.listRuns(10);
    expect(runs[0]).toMatchObject({ id: 'run-1', scanned: 5, summary: 'done' });
  });
});
