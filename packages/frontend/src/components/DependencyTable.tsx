import Tooltip from '@material-ui/core/Tooltip';
import { Table, TableColumn } from '@backstage/core-components';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';
import { DriftBadge } from './DriftBadge';
import { UsageBadge } from './UsageBadge';
import Link from '@material-ui/core/Link';

/** Strip leading semver range specifiers (^, ~, >=, ==, etc.) for a cleaner display. */
function cleanVersion(v: string): string {
  return v.replace(/^[~^>=<! ]+/, '').trim() || v;
}

export interface DependencyTableProps {
  rows: DependencyRecord[];
  title?: string;
  /** Show the owning entity column (hidden on a single component's own tab). */
  showEntity?: boolean;
  /** Show the manifest path column (useful when multiple manifests are present). */
  showManifest?: boolean;
  loading?: boolean;
  /** Called when a library name is clicked (e.g. to open the occurrence viewer). */
  onSelectLibrary?: (record: DependencyRecord) => void;
  /** Optional refresh callback — wired to table action when provided. */
  onRefresh?: () => void;
}

/** Shared table for rendering dependency records across every view. */
export const DependencyTable = ({
  rows,
  title,
  showEntity = true,
  showManifest = false,
  loading,
  onSelectLibrary,
  onRefresh,
}: DependencyTableProps) => {
  const columns: TableColumn<DependencyRecord>[] = [
    {
      title: 'Library',
      field: 'name',
      render: row =>
        onSelectLibrary ? (
          <Link component="button" onClick={() => onSelectLibrary(row)}>
            {row.name}
          </Link>
        ) : (
          row.name
        ),
    },
    { title: 'Ecosystem', field: 'ecosystem', width: '8%' },
    { title: 'Scope', field: 'scope', width: '8%' },
    {
      title: 'Project version',
      field: 'declaredVersion',
      render: row => (
        // Show clean version; hover reveals the full range constraint from the manifest.
        <Tooltip title={`Declared as: ${row.declaredVersion}`} placement="top">
          <span style={{ fontFamily: 'monospace', fontSize: '0.85em', cursor: 'default' }}>
            {cleanVersion(row.declaredVersion)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Latest',
      field: 'latestVersion',
      render: row => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
          {row.latestVersion ?? '—'}
        </span>
      ),
    },
    {
      title: 'Drift',
      field: 'driftSeverity',
      render: row => <DriftBadge severity={row.driftSeverity} />,
    },
    { title: 'License', field: 'license', render: row => row.license ?? '—' },
    { title: 'Usage', field: 'unused', render: row => <UsageBadge record={row} /> },
  ];

  if (showManifest) {
    columns.splice(2, 0, {
      title: 'Manifest',
      field: 'manifestPath',
      render: row => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.78em' }}>{row.manifestPath}</span>
      ),
    });
  }

  if (showEntity) {
    columns.unshift({
      title: 'Component',
      field: 'entityRef',
      render: row => <EntityRefLink entityRef={row.entityRef} />,
    });
  }

  const actions = onRefresh
    ? [{ icon: 'refresh', tooltip: 'Refresh', isFreeAction: true, onClick: onRefresh }]
    : [];

  return (
    <Table<DependencyRecord>
      title={title}
      columns={columns}
      data={rows}
      isLoading={loading}
      actions={actions}
      options={{
        paging: rows.length > 20,
        pageSize: 20,
        search: true,
        filtering: true,
        padding: 'dense',
      }}
    />
  );
};
