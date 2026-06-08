/**
 * New Backstage frontend system exports.
 *
 * Usage in a host app:
 *   import libraryTrackerPlugin from 'backstage-plugin-library-tracker/alpha';
 *
 *   createApp({ features: [libraryTrackerPlugin, ...] });
 */
import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { convertLegacyRouteRef } from '@backstage/core-compat-api';
import { libraryTrackerApiRef, LibraryTrackerClient } from './api';
import { rootRouteRef, entityContentRouteRef, systemContentRouteRef } from './routes';
import LibraryTrackerIcon from '@material-ui/icons/AccountTree';

const apiExtension = ApiBlueprint.make({
  params: defineParams =>
    defineParams(
      createApiFactory({
        api: libraryTrackerApiRef,
        deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
        factory: ({ discoveryApi, fetchApi }) =>
          new LibraryTrackerClient({ discoveryApi, fetchApi }),
      }),
    ),
});

// Org-wide page — automatically added to the sidebar navigation.
const page = PageBlueprint.make({
  params: {
    path: '/library-tracker',
    title: 'Library Tracker',
    icon: <LibraryTrackerIcon />,
    routeRef: convertLegacyRouteRef(rootRouteRef),
    loader: () =>
      import('./components/LibraryTrackerPage').then(({ LibraryTrackerPage }) => (
        <LibraryTrackerPage />
      )),
  },
});

// Dependencies tab on Component entity pages.
const entityContent = EntityContentBlueprint.make({
  name: 'dependencies',
  params: {
    path: '/dependencies',
    title: 'Dependencies',
    filter: 'kind:component',
    routeRef: convertLegacyRouteRef(entityContentRouteRef),
    loader: () =>
      import('./components/EntityLibraryTrackerContent').then(
        ({ EntityLibraryTrackerContent }) => <EntityLibraryTrackerContent />,
      ),
  },
});

// Dependencies tab on System entity pages — aggregates all components owned by the team.
const systemContent = EntityContentBlueprint.make({
  name: 'system-dependencies',
  params: {
    path: '/dependencies',
    title: 'Dependencies',
    filter: 'kind:system',
    routeRef: convertLegacyRouteRef(systemContentRouteRef),
    loader: () =>
      import('./components/SystemLibraryTrackerContent').then(
        ({ SystemLibraryTrackerContent }) => <SystemLibraryTrackerContent />,
      ),
  },
});

export default createFrontendPlugin({
  pluginId: 'library-tracker',
  extensions: [apiExtension, page, entityContent, systemContent],
});
