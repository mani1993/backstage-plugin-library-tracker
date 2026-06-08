/*
 * Standalone dev app for the library-tracker frontend.
 * Run with: `yarn workspace backstage-plugin-library-tracker start`
 *
 * It overrides the API with an in-memory mock (see mockApi.ts) so the whole UI renders without
 * a backend — handy for development and for the README screenshots.
 */
import { Entity } from '@backstage/catalog-model';
import {
  attachComponentData,
  createApiFactory,
} from '@backstage/core-plugin-api';
import { createDevApp } from '@backstage/dev-utils';
import {
  EntityProvider,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import {
  EntityLibraryTrackerContent,
  libraryTrackerApiRef,
  libraryTrackerPlugin,
  LibraryTrackerPage,
  SystemLibraryTrackerContent,
} from '../src';
import { MockLibraryTrackerApi } from './mockApi';

const sampleEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'orders-service', namespace: 'default' },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-payments' },
};

const sampleSystem: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'System',
  metadata: { name: 'payments-platform', namespace: 'default' },
  spec: { owner: 'team-payments' },
};

// EntityRefLink needs `entityRouteRef` bound to a path; the dev app doesn't include the
// catalog plugin, so bind it to a stub page here to keep links from throwing.
const EntityRouteStub = () => null;
attachComponentData(EntityRouteStub, 'core.mountPoint', entityRouteRef);

createDevApp()
  .registerPlugin(libraryTrackerPlugin)
  .registerApi(
    createApiFactory(libraryTrackerApiRef, new MockLibraryTrackerApi()),
  )
  .addPage({
    path: '/library-tracker',
    title: 'Library Tracker',
    element: <LibraryTrackerPage />,
  })
  .addPage({
    path: '/entity-tab',
    title: 'Entity tab',
    element: (
      <EntityProvider entity={sampleEntity}>
        <EntityLibraryTrackerContent />
      </EntityProvider>
    ),
  })
  .addPage({
    path: '/system-tab',
    title: 'System tab',
    element: (
      <EntityProvider entity={sampleSystem}>
        <SystemLibraryTrackerContent />
      </EntityProvider>
    ),
  })
  .addPage({
    path: '/catalog/:namespace/:kind/:name',
    element: <EntityRouteStub />,
  })
  .render();
