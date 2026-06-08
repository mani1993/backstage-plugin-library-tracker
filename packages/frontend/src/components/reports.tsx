import { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { DependencyRecord, DuplicateVersionItem } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';
import { AsyncView } from './AsyncView';
import { DependencyTable } from './DependencyTable';
import { OccurrenceDialog } from './OccurrenceDialog';

/** A dependency table fed by one API call, with the occurrence viewer wired in. */
function DependencyReport({ load, title }: { load: () => Promise<DependencyRecord[]>; title: string }) {
  const [selected, setSelected] = useState<DependencyRecord | undefined>();
  const { value, loading, error } = useAsync(load, []);

  return (
    <AsyncView loading={loading} error={error}>
      <DependencyTable rows={value ?? []} title={title} onSelectLibrary={setSelected} />
      <OccurrenceDialog
        open={Boolean(selected)}
        name={selected?.name}
        entityRef={selected?.entityRef}
        onClose={() => setSelected(undefined)}
      />
    </AsyncView>
  );
}

export const AllDependencies = () => {
  const api = useApi(libraryTrackerApiRef);
  return <DependencyReport title="All dependencies" load={async () => (await api.listDependencies({ limit: 1000 })).items} />;
};

export const UnusedReport = () => {
  const api = useApi(libraryTrackerApiRef);
  return <DependencyReport title="Declared but unused" load={() => api.unused()} />;
};

export const OutdatedReport = () => {
  const api = useApi(libraryTrackerApiRef);
  return <DependencyReport title="Outdated dependencies" load={() => api.outdated()} />;
};

export const DuplicatesReport = () => {
  const api = useApi(libraryTrackerApiRef);
  const { value, loading, error } = useAsync(() => api.duplicates(), []);

  const columns: TableColumn<DuplicateVersionItem>[] = [
    { title: 'Library', field: 'name' },
    { title: 'Ecosystem', field: 'ecosystem', width: '10%' },
    { title: 'Versions', field: 'versionCount', width: '10%' },
    {
      title: 'Spread across the org',
      render: row =>
        row.versions
          .map(v => `${v.version || '(unspecified)'} ×${v.entityRefs.length}`)
          .join(', '),
    },
  ];

  return (
    <AsyncView loading={loading} error={error}>
      <Table<DuplicateVersionItem>
        title="Conflicting versions"
        columns={columns}
        data={value ?? []}
        options={{ paging: (value?.length ?? 0) > 20, pageSize: 20, search: true, padding: 'dense' }}
      />
    </AsyncView>
  );
};
