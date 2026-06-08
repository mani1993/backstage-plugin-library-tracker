import { ComponentType, ReactNode } from 'react';
import { StatusOK, StatusWarning, StatusError, StatusPending, StatusAborted } from '@backstage/core-components';
import { DriftSeverity } from 'backstage-plugin-library-tracker-common';

const BADGES: Record<DriftSeverity, { Status: ComponentType<{ children?: ReactNode }>; label: string }> = {
  major: { Status: StatusError, label: 'major' },
  minor: { Status: StatusWarning, label: 'minor' },
  patch: { Status: StatusPending, label: 'patch' },
  'up-to-date': { Status: StatusOK, label: 'up to date' },
  unknown: { Status: StatusAborted, label: 'unknown' },
};

/** Colour-coded badge for how far a dependency trails its latest version. */
export const DriftBadge = ({ severity }: { severity: DriftSeverity }) => {
  const { Status, label } = BADGES[severity] ?? BADGES.unknown;
  return <Status>{label}</Status>;
};
