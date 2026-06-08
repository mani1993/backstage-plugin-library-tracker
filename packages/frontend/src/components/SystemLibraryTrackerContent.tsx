import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { Content, ContentHeader } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';
import { AsyncView } from './AsyncView';
import { DependencyTable } from './DependencyTable';
import { OccurrenceDialog } from './OccurrenceDialog';

/**
 * Entity tab for System (and Resource) entities.
 * Shows all dependencies of the components owned by this system's owner group,
 * with the same occurrence viewer available on the component tab.
 */
export const SystemLibraryTrackerContent = () => {
  const { entity } = useEntity();
  const api = useApi(libraryTrackerApiRef);

  // Filter by owner so we show all deps for the same team that owns this system.
  const owner = entity.spec?.owner as string | undefined;

  const { value, loading, error, retry } = useAsyncRetry(
    () => api.listDependencies({ owner, limit: 2000 }).then(r => r.items),
    [owner],
  );

  const [selected, setSelected] = useState<DependencyRecord | undefined>();

  const uniqueManifests = value ? new Set(value.map(r => r.manifestPath)).size : 0;

  return (
    <Content>
      <ContentHeader title="Dependencies">
        {owner && (
          <Box display="flex" alignItems="center" gridGap={8}>
            <Typography variant="body2" color="textSecondary">
              Showing all dependencies for
            </Typography>
            <Chip size="small" label={owner} variant="outlined" />
            {uniqueManifests > 1 && (
              <Chip size="small" label={`${uniqueManifests} manifest files`} variant="outlined" />
            )}
          </Box>
        )}
      </ContentHeader>

      <AsyncView loading={loading} error={error}>
        <DependencyTable
          rows={value ?? []}
          showEntity
          showManifest={uniqueManifests > 1}
          onSelectLibrary={setSelected}
          onRefresh={retry}
        />
        <OccurrenceDialog
          open={Boolean(selected)}
          name={selected?.name}
          entityRef={selected?.entityRef}
          onClose={() => setSelected(undefined)}
        />
      </AsyncView>
    </Content>
  );
};
