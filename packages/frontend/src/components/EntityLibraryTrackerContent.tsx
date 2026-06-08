import { useState } from 'react';
import Button from '@material-ui/core/Button';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { Content, ContentHeader } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';
import { AsyncView } from './AsyncView';
import { DependencyTable } from './DependencyTable';
import { OccurrenceDialog } from './OccurrenceDialog';

/** Entity tab: this component's dependencies, with on-demand rescan and the occurrence viewer. */
export const EntityLibraryTrackerContent = () => {
  const { entity } = useEntity();
  const entityRef = stringifyEntityRef(entity);
  const api = useApi(libraryTrackerApiRef);

  const { value, loading, error, retry } = useAsyncRetry(
    () => api.listEntityDependencies(entityRef),
    [entityRef],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<DependencyRecord | undefined>();

  const refresh = async () => {
    setRefreshing(true);
    try {
      await api.refresh(entityRef);
      retry();
    } finally {
      setRefreshing(false);
    }
  };

  // Show the manifest path column only when there are multiple distinct manifests
  // (e.g. a monorepo component with both package.json and requirements.txt).
  const uniqueManifests = value ? new Set(value.map(r => r.manifestPath)).size : 0;

  return (
    <Content>
      <ContentHeader title="Dependencies">
        <Button variant="contained" color="primary" disabled={refreshing} onClick={refresh}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </Button>
      </ContentHeader>
      <AsyncView loading={loading} error={error}>
        <DependencyTable
          rows={value ?? []}
          showEntity={false}
          showManifest={uniqueManifests > 1}
          onSelectLibrary={setSelected}
        />
        <OccurrenceDialog
          open={Boolean(selected)}
          name={selected?.name}
          entityRef={entityRef}
          onClose={() => setSelected(undefined)}
        />
      </AsyncView>
    </Content>
  );
};
