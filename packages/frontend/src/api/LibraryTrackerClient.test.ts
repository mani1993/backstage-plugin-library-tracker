import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { LibraryTrackerClient } from './LibraryTrackerClient';

const discoveryApi: DiscoveryApi = {
  getBaseUrl: async () => 'http://localhost:7007/api/library-tracker',
};

function clientWith(fetch: jest.Mock) {
  const fetchApi = { fetch } as unknown as FetchApi;
  return new LibraryTrackerClient({ discoveryApi, fetchApi });
}

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('LibraryTrackerClient', () => {
  it('builds the entity dependencies path from an entity ref', async () => {
    const fetch = jest.fn().mockResolvedValue(ok([]));
    await clientWith(fetch).listEntityDependencies('component:default/orders');
    expect(fetch).toHaveBeenCalledWith('http://localhost:7007/api/library-tracker/entities/default/component/orders/dependencies');
  });

  it('returns undefined when a library lookup 404s', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await clientWith(fetch).lookupLibrary('ghost')).toBeUndefined();
  });

  it('encodes scoped names and posts refresh bodies', async () => {
    const fetch = jest.fn().mockResolvedValue(ok({}));
    const client = clientWith(fetch);

    await client.lookupLibrary('@scope/pkg');
    expect(fetch.mock.calls[0][0]).toContain('name=%40scope%2Fpkg');

    await client.refresh('component:default/a');
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:7007/api/library-tracker/scan/refresh',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ entityRef: 'component:default/a' }) }),
    );
  });
});
