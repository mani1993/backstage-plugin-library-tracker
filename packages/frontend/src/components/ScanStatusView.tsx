import { ComponentType, ReactNode, useState } from 'react';
import Button from '@material-ui/core/Button';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import {
  ContentHeader,
  StatusAborted,
  StatusError,
  StatusOK,
  StatusPending,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { ScanOutcome, ScanStatus } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';
import { AsyncView } from './AsyncView';

const OUTCOME_BADGE: Record<ScanOutcome, ComponentType<{ children?: ReactNode }>> = {
  ok: StatusOK,
  skipped: StatusPending,
  error: StatusError,
  pending: StatusAborted,
};

/** Per-component scan status, plus a "Refresh all" trigger. */
export const ScanStatusView = () => {
  const api = useApi(libraryTrackerApiRef);
  const { value, loading, error, retry } = useAsyncRetry(() => api.status(), []);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await api.refresh();
      retry();
    } finally {
      setRefreshing(false);
    }
  };

  const columns: TableColumn<ScanStatus>[] = [
    { title: 'Component', render: row => <EntityRefLink entityRef={row.entityRef} /> },
    { title: 'Provider', field: 'provider', render: row => row.provider ?? '—' },
    {
      title: 'Last outcome',
      render: row => {
        const Badge = OUTCOME_BADGE[row.lastOutcome] ?? StatusAborted;
        return <Badge>{row.lastOutcome}</Badge>;
      },
    },
    { title: 'Last scanned', field: 'lastScannedAt', render: row => row.lastScannedAt ?? '—' },
    { title: 'Error', field: 'lastError', render: row => row.lastError ?? '' },
  ];

  return (
    <>
      <ContentHeader title="Scan status">
        <Button variant="contained" color="primary" disabled={refreshing} onClick={refreshAll}>
          {refreshing ? 'Refreshing…' : 'Refresh all'}
        </Button>
      </ContentHeader>
      <AsyncView loading={loading} error={error}>
        <Table<ScanStatus>
          columns={columns}
          data={value ?? []}
          options={{ paging: (value?.length ?? 0) > 20, pageSize: 20, search: true, padding: 'dense' }}
        />
      </AsyncView>
    </>
  );
};
