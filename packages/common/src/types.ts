/**
 * Domain model shared across the plugin. These shapes are what the backend persists
 * and serialises, and what the frontend renders — keep them serialisable (no class
 * instances, dates as ISO strings).
 */

/** Dependency ecosystems supported in v1. New ones plug in behind the parser interface. */
export type Ecosystem = 'npm' | 'maven' | 'python' | 'nuget';

/** How far a declared version trails the latest published version. */
export type DriftSeverity = 'major' | 'minor' | 'patch' | 'up-to-date' | 'unknown';

/** Where a dependency is declared in its manifest. Normalised across ecosystems. */
export type DependencyScope = 'prod' | 'dev' | 'peer' | 'optional';

/** Outcome of scanning a single component's repository. */
export type ScanOutcome = 'ok' | 'error' | 'skipped' | 'pending';

/** What kicked off a scan run. */
export type ScanTrigger = 'schedule' | 'manual';

/** A single place in source code where a dependency is imported. */
export interface Occurrence {
  /** Path of the source file within the repository. */
  path: string;
  /** 1-based line number of the import/usage. */
  line: number;
}

/**
 * One declared dependency of one component, enriched with registry data and the
 * result of usage analysis. This is the central record behind every view.
 */
export interface DependencyRecord {
  id: string;
  /** Entity that declares it, e.g. `component:default/orders`. */
  entityRef: string;
  /** Owner of that entity, carried through for owner-grouped views. */
  owner?: string;
  ecosystem: Ecosystem;
  /** Manifest the dependency was declared in (repo-relative), e.g. `services/api/pom.xml`. */
  manifestPath: string;
  name: string;
  declaredVersion: string;
  scope: DependencyScope;
  license?: string;
  latestVersion?: string;
  driftSeverity: DriftSeverity;
  /** True when at least one import was matched in the component's source. */
  used: boolean;
  /** Confidence of the used/unused determination, 0..1 (ecosystem-dependent). */
  confidence: number;
  /** True when declared but no matching import was found (above the confidence threshold). */
  unused: boolean;
}

/** Per-component scan state, used for the status view and incremental syncing. */
export interface ScanStatus {
  entityRef: string;
  owner?: string;
  sourceUrl?: string;
  provider?: string;
  /** Reader ETag of the last successfully scanned tree (the "last synced commit"). */
  lastEtag?: string;
  lastScannedAt?: string;
  lastOutcome: ScanOutcome;
  lastError?: string;
}

/** A record of one scan pass over the catalog, for audit and progress. */
export interface ScanRun {
  id: string;
  trigger: ScanTrigger;
  startedAt: string;
  finishedAt?: string;
  scanned: number;
  skipped: number;
  failed: number;
  summary?: string;
}
