import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { CatalogEntitySource } from './catalog/EntitySource';
import { readLibraryTrackerConfig } from './config';
import { DefaultRegistryClient, RegistryClient } from './registry';
import { Scanner } from './scan';
import { createRouter } from './service/router';
import { DatabaseLibraryTrackerStore } from './store';

/** Backend plugin: scans component repos and serves the library-tracker API. */
export const libraryTrackerPlugin = createBackendPlugin({
  pluginId: 'library-tracker',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        reader: coreServices.urlReader,
        database: coreServices.database,
        cache: coreServices.cache,
        scheduler: coreServices.scheduler,
        auth: coreServices.auth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({ logger, config, reader, database, cache, scheduler, auth, httpRouter, catalog }) {
        const settings = readLibraryTrackerConfig(config);

        const store = await DatabaseLibraryTrackerStore.create(database);
        const registry: RegistryClient = settings.enableVersionCheck
          ? new DefaultRegistryClient({ logger, cache, ttlMs: settings.cacheTtlMs })
          : { fetchInfo: async () => ({}) };
        const scanner = new Scanner({
          reader,
          registry,
          store,
          entities: new CatalogEntitySource(catalog, auth),
          logger,
          concurrency: settings.concurrency,
          excludePaths: settings.excludePaths,
        });

        httpRouter.use(await createRouter({ logger, store, scanner }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });

        await scheduler.scheduleTask({
          id: 'library-tracker-scan',
          ...settings.schedule,
          fn: async () => {
            await scanner.scanAll('schedule');
          },
        });

        logger.info('library-tracker backend initialised');
      },
    });
  },
});
