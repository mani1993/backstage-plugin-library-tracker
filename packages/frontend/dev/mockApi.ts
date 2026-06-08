/*
 * In-memory mock of the backend, used by the dev app (and for README screenshots) so the
 * UI renders fully without a running backend. The reports are derived from one master list,
 * mirroring how the real backend computes them.
 */
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
import { LibraryTrackerApi } from '../src/api';

const OUTDATED: DriftSeverity[] = ['major', 'minor', 'patch'];

function record(r: Omit<DependencyRecord, 'id'>): DependencyRecord {
  return {
    id: `${r.entityRef}|${r.manifestPath}|${r.ecosystem}|${r.name}`,
    ...r,
  };
}

const RECORDS: DependencyRecord[] = [
  // orders-service — npm
  record({
    entityRef: 'component:default/orders-service',
    owner: 'team-payments',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'lodash',
    declaredVersion: '^4.17.0',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '4.17.21',
    driftSeverity: 'patch',
    used: true,
    confidence: 0.95,
    unused: false,
  }),
  record({
    entityRef: 'component:default/orders-service',
    owner: 'team-payments',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'express',
    declaredVersion: '^4.18.0',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '5.0.0',
    driftSeverity: 'major',
    used: true,
    confidence: 0.95,
    unused: false,
  }),
  record({
    entityRef: 'component:default/orders-service',
    owner: 'team-payments',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'left-pad',
    declaredVersion: '^1.3.0',
    scope: 'prod',
    license: 'WTFPL',
    latestVersion: '1.3.0',
    driftSeverity: 'up-to-date',
    used: false,
    confidence: 0.9,
    unused: true,
  }),

  // web-frontend — npm (older lodash → duplicate version across the org)
  record({
    entityRef: 'component:default/web-frontend',
    owner: 'team-web',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'react',
    declaredVersion: '^17.0.2',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '18.3.1',
    driftSeverity: 'major',
    used: true,
    confidence: 0.95,
    unused: false,
  }),
  record({
    entityRef: 'component:default/web-frontend',
    owner: 'team-web',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'lodash',
    declaredVersion: '^3.10.1',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '4.17.21',
    driftSeverity: 'major',
    used: true,
    confidence: 0.95,
    unused: false,
  }),
  record({
    entityRef: 'component:default/web-frontend',
    owner: 'team-web',
    ecosystem: 'npm',
    manifestPath: 'package.json',
    name: 'moment',
    declaredVersion: '^2.29.0',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '2.30.1',
    driftSeverity: 'minor',
    used: true,
    confidence: 0.95,
    unused: false,
  }),

  // data-pipeline — python
  record({
    entityRef: 'component:default/data-pipeline',
    owner: 'team-data',
    ecosystem: 'python',
    manifestPath: 'requirements.txt',
    name: 'requests',
    declaredVersion: '==2.28.0',
    scope: 'prod',
    license: 'Apache-2.0',
    latestVersion: '2.32.3',
    driftSeverity: 'minor',
    used: true,
    confidence: 0.85,
    unused: false,
  }),
  record({
    entityRef: 'component:default/data-pipeline',
    owner: 'team-data',
    ecosystem: 'python',
    manifestPath: 'requirements.txt',
    name: 'pyyaml',
    declaredVersion: '==6.0',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '6.0.2',
    driftSeverity: 'patch',
    used: true,
    confidence: 0.85,
    unused: false,
  }),
  record({
    entityRef: 'component:default/data-pipeline',
    owner: 'team-data',
    ecosystem: 'python',
    manifestPath: 'requirements.txt',
    name: 'flask',
    declaredVersion: '==2.0.0',
    scope: 'prod',
    license: 'BSD-3-Clause',
    latestVersion: '3.0.3',
    driftSeverity: 'major',
    used: false,
    confidence: 0.7,
    unused: true,
  }),

  // billing-api — maven (used-only: high drift but never flagged unused)
  record({
    entityRef: 'component:default/billing-api',
    owner: 'team-payments',
    ecosystem: 'maven',
    manifestPath: 'pom.xml',
    name: 'com.google.guava:guava',
    declaredVersion: '32.0',
    scope: 'prod',
    license: 'Apache-2.0',
    latestVersion: '33.3.1',
    driftSeverity: 'major',
    used: true,
    confidence: 0.6,
    unused: false,
  }),
  record({
    entityRef: 'component:default/billing-api',
    owner: 'team-payments',
    ecosystem: 'maven',
    manifestPath: 'pom.xml',
    name: 'org.springframework:spring-core',
    declaredVersion: '5.3.20',
    scope: 'prod',
    license: 'Apache-2.0',
    latestVersion: '6.1.13',
    driftSeverity: 'major',
    used: false,
    confidence: 0.35,
    unused: false,
  }),
  record({
    entityRef: 'component:default/billing-api',
    owner: 'team-payments',
    ecosystem: 'maven',
    manifestPath: 'pom.xml',
    name: 'junit:junit',
    declaredVersion: '4.13.2',
    scope: 'dev',
    license: 'EPL-1.0',
    latestVersion: '4.13.2',
    driftSeverity: 'up-to-date',
    used: true,
    confidence: 0.6,
    unused: false,
  }),

  // payments-worker — nuget
  record({
    entityRef: 'component:default/payments-worker',
    owner: 'team-payments',
    ecosystem: 'nuget',
    manifestPath: 'PaymentsWorker.csproj',
    name: 'Newtonsoft.Json',
    declaredVersion: '13.0.1',
    scope: 'prod',
    license: 'MIT',
    latestVersion: '13.0.3',
    driftSeverity: 'patch',
    used: true,
    confidence: 0.6,
    unused: false,
  }),
  record({
    entityRef: 'component:default/payments-worker',
    owner: 'team-payments',
    ecosystem: 'nuget',
    manifestPath: 'PaymentsWorker.csproj',
    name: 'Serilog',
    declaredVersion: '2.12.0',
    scope: 'prod',
    license: 'Apache-2.0',
    latestVersion: '4.0.2',
    driftSeverity: 'major',
    used: true,
    confidence: 0.6,
    unused: false,
  }),
];

const OCCURRENCES: Record<string, OccurrenceGroup[]> = {
  lodash: [
    {
      entityRef: 'component:default/orders-service',
      manifestPath: 'package.json',
      repoUrl: 'https://github.com/example-org/orders-service/tree/main',
      occurrences: [
        { path: 'src/orders.ts', line: 3 },
        { path: 'src/util/format.ts', line: 12 },
      ],
    },
    {
      entityRef: 'component:default/web-frontend',
      manifestPath: 'package.json',
      repoUrl: 'https://github.com/example-org/web-frontend/tree/main',
      occurrences: [{ path: 'src/components/Cart.tsx', line: 8 }],
    },
  ],
  express: [
    {
      entityRef: 'component:default/orders-service',
      manifestPath: 'package.json',
      repoUrl: 'https://github.com/example-org/orders-service/tree/main',
      occurrences: [{ path: 'src/server.ts', line: 1 }],
    },
  ],
};

const STATUSES: ScanStatus[] = [
  {
    entityRef: 'component:default/orders-service',
    owner: 'team-payments',
    provider: 'github',
    lastOutcome: 'ok',
    lastScannedAt: '2026-06-08T09:00:00Z',
  },
  {
    entityRef: 'component:default/web-frontend',
    owner: 'team-web',
    provider: 'gitlab',
    lastOutcome: 'ok',
    lastScannedAt: '2026-06-08T09:00:05Z',
  },
  {
    entityRef: 'component:default/data-pipeline',
    owner: 'team-data',
    provider: 'github',
    lastOutcome: 'skipped',
    lastScannedAt: '2026-06-08T09:00:07Z',
  },
  {
    entityRef: 'component:default/billing-api',
    owner: 'team-payments',
    provider: 'bitbucket',
    lastOutcome: 'ok',
    lastScannedAt: '2026-06-08T09:00:11Z',
  },
  {
    entityRef: 'component:default/payments-worker',
    owner: 'team-payments',
    provider: 'azure',
    lastOutcome: 'error',
    lastScannedAt: '2026-06-08T09:00:13Z',
    lastError: 'source-location unreachable (401)',
  },
];

const RUNS: ScanRun[] = [
  {
    id: 'run-2',
    trigger: 'manual',
    startedAt: '2026-06-08T09:00:00Z',
    finishedAt: '2026-06-08T09:00:14Z',
    scanned: 4,
    skipped: 1,
    failed: 0,
    summary: '4 scanned, 1 skipped, 0 failed',
  },
  {
    id: 'run-1',
    trigger: 'schedule',
    startedAt: '2026-06-08T03:00:00Z',
    finishedAt: '2026-06-08T03:00:18Z',
    scanned: 5,
    skipped: 0,
    failed: 0,
    summary: '5 scanned, 0 skipped, 0 failed',
  },
];

export class MockLibraryTrackerApi implements LibraryTrackerApi {
  async listDependencies(
    query: DependencyQuery = {},
  ): Promise<DependencyListResponse> {
    const items = RECORDS.filter(
      r =>
        (!query.entityRef || r.entityRef === query.entityRef) &&
        (!query.ecosystem || r.ecosystem === query.ecosystem) &&
        (!query.owner || r.owner === query.owner) &&
        (!query.severity || r.driftSeverity === query.severity) &&
        (!query.unused || r.unused) &&
        (!query.outdated || OUTDATED.includes(r.driftSeverity)),
    );
    return { items, total: items.length };
  }

  async listEntityDependencies(entityRef: string): Promise<DependencyRecord[]> {
    return RECORDS.filter(r => r.entityRef === entityRef);
  }

  async lookupLibrary(name: string): Promise<LibrarySummary | undefined> {
    const matches = RECORDS.filter(r => r.name === name);
    if (matches.length === 0) return undefined;
    return {
      name,
      ecosystems: [...new Set(matches.map(r => r.ecosystem))],
      latestVersion: matches.find(r => r.latestVersion)?.latestVersion,
      versions: [...new Set(matches.map(r => r.declaredVersion))],
      entityCount: new Set(matches.map(r => r.entityRef)).size,
      usages: matches.map(r => ({
        entityRef: r.entityRef,
        owner: r.owner,
        ecosystem: r.ecosystem,
        manifestPath: r.manifestPath,
        declaredVersion: r.declaredVersion,
        latestVersion: r.latestVersion,
        driftSeverity: r.driftSeverity,
        unused: r.unused,
      })),
    };
  }

  async getOccurrences(
    name: string,
    entityRef?: string,
  ): Promise<OccurrenceGroup[]> {
    const groups = OCCURRENCES[name] ?? [];
    return entityRef ? groups.filter(g => g.entityRef === entityRef) : groups;
  }

  async duplicates(): Promise<DuplicateVersionItem[]> {
    const byKey = new Map<string, DependencyRecord[]>();
    for (const r of RECORDS) {
      const key = `${r.name} ${r.ecosystem}`;
      byKey.set(key, [...(byKey.get(key) ?? []), r]);
    }
    return [...byKey.values()]
      .map(group => {
        const versions = new Map<string, string[]>();
        for (const r of group)
          versions.set(r.declaredVersion, [
            ...(versions.get(r.declaredVersion) ?? []),
            r.entityRef,
          ]);
        return {
          name: group[0].name,
          ecosystem: group[0].ecosystem,
          versionCount: versions.size,
          versions: [...versions.entries()].map(([version, entityRefs]) => ({
            version,
            entityRefs,
          })),
        };
      })
      .filter(item => item.versionCount > 1);
  }

  async unused(): Promise<DependencyRecord[]> {
    return RECORDS.filter(r => r.unused);
  }

  async outdated(severity?: DriftSeverity): Promise<DependencyRecord[]> {
    return RECORDS.filter(r =>
      severity
        ? r.driftSeverity === severity
        : OUTDATED.includes(r.driftSeverity),
    );
  }

  async status(): Promise<ScanStatus[]> {
    return STATUSES;
  }

  async runs(): Promise<ScanRun[]> {
    return RUNS;
  }

  async refresh(): Promise<RefreshResponse> {
    return { run: RUNS[0], targets: RECORDS.length };
  }

  async getOverviewStats(): Promise<OverviewStats> {
    const byDriftSeverity = { major: 0, minor: 0, patch: 0, 'up-to-date': 0, unknown: 0 };
    const byEcosystem: Partial<Record<string, number>> = {};
    const majorByEntity = new Map<string, { owner?: string; count: number }>();

    for (const r of RECORDS) {
      byDriftSeverity[r.driftSeverity] = (byDriftSeverity[r.driftSeverity] ?? 0) + 1;
      byEcosystem[r.ecosystem] = (byEcosystem[r.ecosystem] ?? 0) + 1;
      if (r.driftSeverity === 'major') {
        const entry = majorByEntity.get(r.entityRef) ?? { owner: r.owner, count: 0 };
        entry.count++;
        majorByEntity.set(r.entityRef, entry);
      }
    }

    return {
      totalComponents: new Set(RECORDS.map(r => r.entityRef)).size,
      totalDependencies: RECORDS.length,
      unusedCount: RECORDS.filter(r => r.unused).length,
      byDriftSeverity,
      byEcosystem,
      topAffected: [...majorByEntity.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([entityRef, { owner, count }]) => ({ entityRef, owner, majorCount: count })),
    };
  }
}
