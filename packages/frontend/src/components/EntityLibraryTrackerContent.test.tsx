import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Entity } from '@backstage/catalog-model';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';
import { LibraryTrackerApi, libraryTrackerApiRef } from '../api';
import { EntityLibraryTrackerContent } from './EntityLibraryTrackerContent';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'orders', namespace: 'default' },
  spec: { type: 'service', owner: 'team-a' },
};

const lodash: DependencyRecord = {
  id: '1',
  entityRef: 'component:default/orders',
  ecosystem: 'npm',
  manifestPath: 'package.json',
  name: 'lodash',
  declaredVersion: '^4.0.0',
  scope: 'prod',
  latestVersion: '4.17.21',
  driftSeverity: 'minor',
  used: true,
  confidence: 0.95,
  unused: false,
};

function renderContent(api: Partial<LibraryTrackerApi>) {
  return renderInTestApp(
    <TestApiProvider apis={[[libraryTrackerApiRef, api]]}>
      <EntityProvider entity={entity}>
        <EntityLibraryTrackerContent />
      </EntityProvider>
    </TestApiProvider>,
  );
}

describe('EntityLibraryTrackerContent', () => {
  it('lists the entity dependencies', async () => {
    const api = { listEntityDependencies: jest.fn().mockResolvedValue([lodash]), refresh: jest.fn() };
    await renderContent(api);

    expect(api.listEntityDependencies).toHaveBeenCalledWith('component:default/orders');
    expect(await screen.findByText('lodash')).toBeInTheDocument();
  });

  it('triggers a rescan when "Refresh now" is clicked', async () => {
    const api = {
      listEntityDependencies: jest.fn().mockResolvedValue([]),
      refresh: jest.fn().mockResolvedValue({ run: {}, targets: 1 }),
    };
    await renderContent(api);

    await userEvent.click(await screen.findByText('Refresh now'));
    expect(api.refresh).toHaveBeenCalledWith('component:default/orders');
  });
});
