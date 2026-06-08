import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useAsync from 'react-use/lib/useAsync';
import { InfoCard, Link, Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { LibraryUsage } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';
import { AsyncView } from './AsyncView';
import { DriftBadge } from './DriftBadge';
import { OccurrenceDialog } from './OccurrenceDialog';

/** Reverse search: which components depend on a library, at which versions. */
export const PackageSearch = () => {
  const api = useApi(libraryTrackerApiRef);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [occurrenceFor, setOccurrenceFor] = useState<LibraryUsage | undefined>();

  const { value, loading, error } = useAsync(
    () => (query ? api.lookupLibrary(query) : Promise.resolve(undefined)),
    [query],
  );

  const columns: TableColumn<LibraryUsage>[] = [
    { title: 'Component', render: row => <EntityRefLink entityRef={row.entityRef} /> },
    { title: 'Owner', field: 'owner', render: row => row.owner ?? '—' },
    { title: 'Declared', field: 'declaredVersion' },
    { title: 'Drift', render: row => <DriftBadge severity={row.driftSeverity} /> },
    {
      title: '',
      render: row => (
        <Link to="#" onClick={() => setOccurrenceFor(row)}>
          view usages
        </Link>
      ),
    },
  ];

  return (
    <>
      <Box display="flex" gridGap={8} marginBottom={2}>
        <TextField
          label="Library name"
          placeholder="e.g. lodash or com.google.guava:guava"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setQuery(input.trim())}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={() => setQuery(input.trim())}>
          Search
        </Button>
      </Box>

      <AsyncView loading={loading} error={error}>
        {query && !value && <Typography>No component depends on “{query}”.</Typography>}
        {value && (
          <InfoCard title={value.name}>
            <Typography variant="body2" gutterBottom>
              Used by {value.entityCount} component(s){value.latestVersion ? ` · latest ${value.latestVersion}` : ''} ·
              versions: {value.versions.join(', ') || 'n/a'}
            </Typography>
            <Table<LibraryUsage>
              columns={columns}
              data={value.usages}
              options={{ paging: value.usages.length > 20, pageSize: 20, search: false, padding: 'dense', toolbar: false }}
            />
          </InfoCard>
        )}
      </AsyncView>

      <OccurrenceDialog
        open={Boolean(occurrenceFor)}
        name={value?.name}
        entityRef={occurrenceFor?.entityRef}
        onClose={() => setOccurrenceFor(undefined)}
      />
    </>
  );
};
