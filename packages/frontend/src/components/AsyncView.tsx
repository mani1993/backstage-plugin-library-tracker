import { ReactNode } from 'react';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';

/** Standard loading/error wrapper so each view doesn't repeat the same three lines. */
export const AsyncView = ({
  loading,
  error,
  children,
}: {
  loading?: boolean;
  error?: Error;
  children: ReactNode;
}) => {
  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;
  return <>{children}</>;
};
