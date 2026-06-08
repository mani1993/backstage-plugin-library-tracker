/**
 * Request/response contracts for the library-tracker REST API. The backend router and
 * the frontend client both depend on these so they never drift apart.
 */
import {
  DependencyRecord,
  DriftSeverity,
  Ecosystem,
  Occurrence,
  ScanRun,
  ScanStatus,
} from './types';

/** Filters for the main dependency listing. All fields optional. */
export interface DependencyQuery {
  entityRef?: string;
  ecosystem?: Ecosystem;
  owner?: string;
  /** Only dependencies at this drift severity. */
  severity?: DriftSeverity;
  /** When true, only unused dependencies. */
  unused?: boolean;
  /** When true, only dependencies that are behind latest (any non `up-to-date` severity). */
  outdated?: boolean;
  offset?: number;
  limit?: number;
}

/** Paginated list of dependency records. */
export interface DependencyListResponse {
  items: DependencyRecord[];
  total: number;
}

/** One component's use of a library, returned by the reverse search. */
export interface LibraryUsage {
  entityRef: string;
  owner?: string;
  ecosystem: Ecosystem;
  manifestPath: string;
  declaredVersion: string;
  latestVersion?: string;
  driftSeverity: DriftSeverity;
  unused: boolean;
}

/** Reverse-search result: every component that depends on a given library. */
export interface LibrarySummary {
  name: string;
  /** Distinct ecosystems the name appears under (usually one). */
  ecosystems: Ecosystem[];
  latestVersion?: string;
  /** Distinct declared versions seen across the org. */
  versions: string[];
  entityCount: number;
  usages: LibraryUsage[];
}

/** One library declared at conflicting versions across the org. */
export interface DuplicateVersionItem {
  name: string;
  ecosystem: Ecosystem;
  versionCount: number;
  versions: Array<{ version: string; entityRefs: string[] }>;
}

/** Files/lines where a library is imported within one component's manifest. */
export interface OccurrenceGroup {
  entityRef: string;
  manifestPath: string;
  /** Base repository URL from the component's source-location, used to build VCS file links. */
  repoUrl?: string;
  occurrences: Occurrence[];
}

/** Body for POST /scan/refresh — omit entityRef to scan the whole catalog. */
export interface RefreshRequest {
  entityRef?: string;
}

/** Result of triggering a scan. */
export interface RefreshResponse {
  run: ScanRun;
  /** Number of components queued for scanning. */
  targets: number;
}

export interface ScanStatusResponse {
  items: ScanStatus[];
}

export interface ScanRunsResponse {
  items: ScanRun[];
}

/** Aggregated snapshot of the org's dependency health — used by the Overview dashboard. */
export interface OverviewStats {
  totalComponents: number;
  totalDependencies: number;
  unusedCount: number;
  byDriftSeverity: Record<DriftSeverity, number>;
  byEcosystem: Partial<Record<Ecosystem, number>>;
  /** Top 10 components by number of major-drift dependencies. */
  topAffected: Array<{ entityRef: string; owner?: string; majorCount: number }>;
}
