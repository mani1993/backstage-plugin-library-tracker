/*
 * Standalone dev backend for the library-tracker plugin.
 *
 * Run with: `yarn workspace backstage-plugin-library-tracker-backend start`
 * It seeds a mock catalog with a couple of components pointing at public repos, so you can
 * POST /api/library-tracker/scan/refresh and inspect the resulting data without a host app.
 * Provide an SCM token via `integrations` in the root app-config.yaml for higher rate limits.
 */
import { createBackend } from '@backstage/backend-defaults';
import { Entity } from '@backstage/catalog-model';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { libraryTrackerPlugin } from '../src/plugin';

const sampleEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'example-node',
      namespace: 'default',
      annotations: {
        'backstage.io/source-location':
          'url:https://github.com/backstage/backstage/tree/master/packages/cli/',
      },
    },
    spec: { type: 'tool', lifecycle: 'production', owner: 'team-a' },
  },
];

const backend = createBackend();
backend.add(catalogServiceMock.factory({ entities: sampleEntities }));
backend.add(libraryTrackerPlugin);
backend.start();
