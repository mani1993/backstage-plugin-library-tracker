import {
  DependencyQuery,
  DependencyRecord,
  DuplicateVersionItem,
  LibrarySummary,
  Occurrence,
  OccurrenceGroup,
  OverviewStats,
  ScanRun,
  ScanStatus,
} from 'backstage-plugin-library-tracker-common';

/** A dependency plus the source occurrences backing its usage determination. */
export interface ScannedDependency {
  record: DependencyRecord;
  occurrences: Occurrence[];
}

export type { OccurrenceGroup };

/**
 * Persistence boundary for the plugin. The scanner writes through it; the router reads
 * through it. Keeping it an interface lets tests swap in an in-memory or sqlite store.
 */
export interface LibraryTrackerStore {
  /** Atomically replace all dependencies (and occurrences) recorded for a component. */
  replaceEntityDependencies(entityRef: string, deps: ScannedDependency[]): Promise<void>;

  getStatus(entityRef: string): Promise<ScanStatus | undefined>;
  upsertStatus(status: ScanStatus): Promise<void>;
  listStatuses(): Promise<ScanStatus[]>;

  insertRun(run: ScanRun): Promise<void>;
  updateRun(run: ScanRun): Promise<void>;
  listRuns(limit: number): Promise<ScanRun[]>;

  listDependencies(query: DependencyQuery): Promise<{ items: DependencyRecord[]; total: number }>;
  listEntityDependencies(entityRef: string): Promise<DependencyRecord[]>;
  listUnused(): Promise<DependencyRecord[]>;
  listOutdated(severity?: DependencyRecord['driftSeverity']): Promise<DependencyRecord[]>;

  getLibrary(name: string): Promise<LibrarySummary | undefined>;
  getOccurrences(name: string, entityRef?: string): Promise<OccurrenceGroup[]>;
  duplicateVersions(): Promise<DuplicateVersionItem[]>;
  getOverviewStats(): Promise<OverviewStats>;
}
