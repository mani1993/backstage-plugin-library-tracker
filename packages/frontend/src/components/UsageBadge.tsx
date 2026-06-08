import Tooltip from '@material-ui/core/Tooltip';
import { StatusOK, StatusError, StatusAborted } from '@backstage/core-components';
import { DependencyRecord } from 'backstage-plugin-library-tracker-common';

/**
 * Used / unused / unknown badge. "unknown" covers low-confidence ecosystems (maven, nuget)
 * where absence of an import isn't strong enough to claim the dependency is unused.
 */
export const UsageBadge = ({ record }: { record: DependencyRecord }) => {
  const confidence = `${Math.round(record.confidence * 100)}% confidence`;

  if (record.used) {
    return (
      <Tooltip title={confidence}>
        <span><StatusOK>used</StatusOK></span>
      </Tooltip>
    );
  }
  if (record.unused) {
    return (
      <Tooltip title={`Declared but no import found — ${confidence}`}>
        <span><StatusError>unused</StatusError></span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={`Could not determine usage — ${confidence}`}>
      <span><StatusAborted>unknown</StatusAborted></span>
    </Tooltip>
  );
};
