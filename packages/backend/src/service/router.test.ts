import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';
import { Scanner } from '../scan';
import { LibraryTrackerStore } from '../store';
import { createRouter } from './router';

async function buildApp(store: Partial<LibraryTrackerStore>, scanner: Partial<Scanner>) {
  const app = express();
  app.use(
    await createRouter({
      logger: mockServices.logger.mock(),
      store: store as LibraryTrackerStore,
      scanner: scanner as Scanner,
    }),
  );
  // Real Backstage error mapping so InputError becomes 400, etc.
  app.use(MiddlewareFactory.create({ config: mockServices.rootConfig(), logger: mockServices.logger.mock() }).error());
  return app;
}

describe('createRouter', () => {
  it('serves health unauthenticated', async () => {
    const app = await buildApp({}, {});
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('lists dependencies and rejects an unknown ecosystem filter', async () => {
    const listDependencies = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const app = await buildApp({ listDependencies }, {});

    await request(app).get('/dependencies?owner=team-a&outdated=true').expect(200);
    expect(listDependencies).toHaveBeenCalledWith(expect.objectContaining({ owner: 'team-a', outdated: true }));

    await request(app).get('/dependencies?ecosystem=cargo').expect(400);
  });

  it('returns 404 for an unknown library and 400 when name is missing', async () => {
    const getLibrary = jest.fn().mockResolvedValue(undefined);
    const app = await buildApp({ getLibrary }, {});

    await request(app).get('/libraries/lookup?name=ghost').expect(404);
    await request(app).get('/libraries/lookup').expect(400);
    expect(getLibrary).toHaveBeenCalledWith('ghost');
  });

  it('refreshes one entity or the whole catalog', async () => {
    const run = { id: 'r1', trigger: 'manual', startedAt: 't', scanned: 1, skipped: 0, failed: 0 };
    const scanOne = jest.fn().mockResolvedValue(run);
    const scanAll = jest.fn().mockResolvedValue(run);
    const app = await buildApp({}, { scanOne, scanAll });

    await request(app).post('/scan/refresh').send({ entityRef: 'component:default/a' }).expect(200);
    expect(scanOne).toHaveBeenCalledWith('component:default/a');
    expect(scanAll).not.toHaveBeenCalled();

    await request(app).post('/scan/refresh').send({}).expect(200);
    expect(scanAll).toHaveBeenCalledWith('manual');
  });
});
