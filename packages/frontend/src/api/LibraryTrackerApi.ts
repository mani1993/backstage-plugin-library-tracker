import { createApiRef } from '@backstage/core-plugin-api';
import {
  DependencyListResponse,
  DependencyQuery,
  DependencyRecord,
  DriftSeverity,
  DuplicateVersionItem,
  LibrarySummary,
  OccurrenceGroup,
  OverviewStats,
  RefreshResponse,
  ScanRun,
  ScanStatus,
} from 'backstage-plugin-library-tracker-common';

/** Client interface for the library-tracker backend. */
export interface LibraryTrackerApi {
  listDependencies(query?: DependencyQuery): Promise<DependencyListResponse>;
  listEntityDependencies(entityRef: string): Promise<DependencyRecord[]>;
  lookupLibrary(name: string): Promise<LibrarySummary | undefined>;
  getOccurrences(name: string, entityRef?: string): Promise<OccurrenceGroup[]>;
  duplicates(): Promise<DuplicateVersionItem[]>;
  unused(): Promise<DependencyRecord[]>;
  outdated(severity?: DriftSeverity): Promise<DependencyRecord[]>;
  status(): Promise<ScanStatus[]>;
  runs(): Promise<ScanRun[]>;
  refresh(entityRef?: string): Promise<RefreshResponse>;
  getOverviewStats(): Promise<OverviewStats>;
}

export const libraryTrackerApiRef = createApiRef<LibraryTrackerApi>({
  id: 'plugin.library-tracker.service',
});
