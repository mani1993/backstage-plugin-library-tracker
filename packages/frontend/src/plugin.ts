import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { libraryTrackerApiRef, LibraryTrackerClient } from './api';
import { entityContentRouteRef, rootRouteRef, systemContentRouteRef } from './routes';

export const libraryTrackerPlugin = createPlugin({
  id: 'library-tracker',
  apis: [
    createApiFactory({
      api: libraryTrackerApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new LibraryTrackerClient({ discoveryApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
    entityContent: entityContentRouteRef,
    systemContent: systemContentRouteRef,
  },
});

/** Org-wide page; mount at a route such as `/library-tracker`. */
export const LibraryTrackerPage = libraryTrackerPlugin.provide(
  createRoutableExtension({
    name: 'LibraryTrackerPage',
    mountPoint: rootRouteRef,
    component: () => import('./components/LibraryTrackerPage').then(m => m.LibraryTrackerPage),
  }),
);

/** Entity tab for Component entities; mount inside an `EntityLayout.Route`. */
export const EntityLibraryTrackerContent = libraryTrackerPlugin.provide(
  createRoutableExtension({
    name: 'EntityLibraryTrackerContent',
    mountPoint: entityContentRouteRef,
    component: () =>
      import('./components/EntityLibraryTrackerContent').then(m => m.EntityLibraryTrackerContent),
  }),
);

/** Entity tab for System (and Resource) entities; mount inside an `EntityLayout.Route`. */
export const SystemLibraryTrackerContent = libraryTrackerPlugin.provide(
  createRoutableExtension({
    name: 'SystemLibraryTrackerContent',
    mountPoint: systemContentRouteRef,
    component: () =>
      import('./components/SystemLibraryTrackerContent').then(m => m.SystemLibraryTrackerContent),
  }),
);
