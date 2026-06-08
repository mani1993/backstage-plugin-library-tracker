import { DatabaseService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import {
  DependencyQuery,
  DependencyRecord,
  DriftSeverity,
  DuplicateVersionItem,
  Ecosystem,
  LibrarySummary,
  LibraryUsage,
  OverviewStats,
  ScanRun,
  ScanStatus,
} from 'backstage-plugin-library-tracker-common';
import { LibraryTrackerStore, OccurrenceGroup, ScannedDependency } from './types';

const STATUS = 'library_tracker_status';
const RUNS = 'library_tracker_runs';
const DEPS = 'library_tracker_dependencies';
const OCC = 'library_tracker_occurrences';

const OUTDATED_SEVERITIES: DriftSeverity[] = ['major', 'minor', 'patch'];

const MIGRATIONS_DIR = resolvePackagePath(
  'backstage-plugin-library-tracker-backend',
  'migrations',
);

/** Map a dependencies row (snake_case, sqlite booleans-as-ints) to a DependencyRecord. */
function toRecord(row: any): DependencyRecord {
  return {
    id: row.id,
    entityRef: row.entity_ref,
    owner: row.owner ?? undefined,
    ecosystem: row.ecosystem,
    manifestPath: row.manifest_path,
    name: row.name,
    declaredVersion: row.declared_version ?? '',
    scope: row.scope,
    license: row.license ?? undefined,
    latestVersion: row.latest_version ?? undefined,
    driftSeverity: row.drift_severity,
    used: Boolean(row.used),
    confidence: Number(row.confidence),
    unused: Boolean(row.unused),
  };
}

function recordToRow(record: DependencyRecord): Record<string, unknown> {
  return {
    id: record.id,
    entity_ref: record.entityRef,
    owner: record.owner ?? null,
    ecosystem: record.ecosystem,
    manifest_path: record.manifestPath,
    name: record.name,
    declared_version: record.declaredVersion,
    scope: record.scope,
    license: record.license ?? null,
    latest_version: record.latestVersion ?? null,
    drift_severity: record.driftSeverity,
    used: record.used,
    confidence: record.confidence,
    unused: record.unused,
  };
}

function toStatus(row: any): ScanStatus {
  return {
    entityRef: row.entity_ref,
    owner: row.owner ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    provider: row.provider ?? undefined,
    lastEtag: row.last_etag ?? undefined,
    lastScannedAt: row.last_scanned_at ?? undefined,
    lastOutcome: row.last_outcome,
    lastError: row.last_error ?? undefined,
  };
}

function toRun(row: any): ScanRun {
  return {
    id: row.id,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    scanned: Number(row.scanned),
    skipped: Number(row.skipped),
    failed: Number(row.failed),
    summary: row.summary ?? undefined,
  };
}

/** Knex-backed persistence for the plugin. */
export class DatabaseLibraryTrackerStore implements LibraryTrackerStore {
  private constructor(private readonly db: Knex) {}

  static async create(database: DatabaseService): Promise<DatabaseLibraryTrackerStore> {
    const db = await database.getClient();
    if (!database.migrations?.skip) {
      await db.migrate.latest({ directory: MIGRATIONS_DIR });
    }
    return new DatabaseLibraryTrackerStore(db);
  }

  async replaceEntityDependencies(entityRef: string, deps: ScannedDependency[]): Promise<void> {
    await this.db.transaction(async trx => {
      const oldIds = await trx(DEPS).where('entity_ref', entityRef).pluck('id');
      if (oldIds.length > 0) {
        await trx(OCC).whereIn('dependency_id', oldIds).delete();
      }
      await trx(DEPS).where('entity_ref', entityRef).delete();

      const depRows = deps.map(d => recordToRow(d.record));
      if (depRows.length > 0) {
        await trx.batchInsert(DEPS, depRows, 50);
      }

      const occRows = deps.flatMap(d =>
        d.occurrences.map(o => ({ dependency_id: d.record.id, file_path: o.path, line: o.line })),
      );
      if (occRows.length > 0) {
        await trx.batchInsert(OCC, occRows, 100);
      }
    });
  }

  async getStatus(entityRef: string): Promise<ScanStatus | undefined> {
    const row = await this.db(STATUS).where('entity_ref', entityRef).first();
    return row ? toStatus(row) : undefined;
  }

  async upsertStatus(status: ScanStatus): Promise<void> {
    const row = {
      entity_ref: status.entityRef,
      owner: status.owner ?? null,
      source_url: status.sourceUrl ?? null,
      provider: status.provider ?? null,
      last_etag: status.lastEtag ?? null,
      last_scanned_at: status.lastScannedAt ?? null,
      last_outcome: status.lastOutcome,
      last_error: status.lastError ?? null,
    };
    await this.db(STATUS).insert(row).onConflict('entity_ref').merge();
  }

  async listStatuses(): Promise<ScanStatus[]> {
    const rows = await this.db(STATUS).orderBy('entity_ref');
    return rows.map(toStatus);
  }

  async insertRun(run: ScanRun): Promise<void> {
    await this.db(RUNS).insert({
      id: run.id,
      trigger: run.trigger,
      started_at: run.startedAt,
      finished_at: run.finishedAt ?? null,
      scanned: run.scanned,
      skipped: run.skipped,
      failed: run.failed,
      summary: run.summary ?? null,
    });
  }

  async updateRun(run: ScanRun): Promise<void> {
    await this.db(RUNS).where('id', run.id).update({
      finished_at: run.finishedAt ?? null,
      scanned: run.scanned,
      skipped: run.skipped,
      failed: run.failed,
      summary: run.summary ?? null,
    });
  }

  async listRuns(limit: number): Promise<ScanRun[]> {
    const rows = await this.db(RUNS).orderBy('started_at', 'desc').limit(limit);
    return rows.map(toRun);
  }

  async listDependencies(query: DependencyQuery): Promise<{ items: DependencyRecord[]; total: number }> {
    const filtered = this.applyFilters(this.db(DEPS), query);

    const countRow = await filtered.clone().count({ count: '*' }).first();
    const total = Number(countRow?.count ?? 0);

    const rows = await filtered
      .clone()
      .orderBy([{ column: 'name' }, { column: 'entity_ref' }])
      .offset(query.offset ?? 0)
      .limit(query.limit ?? 100);

    return { items: rows.map(toRecord), total };
  }

  async listEntityDependencies(entityRef: string): Promise<DependencyRecord[]> {
    const rows = await this.db(DEPS).where('entity_ref', entityRef).orderBy('name');
    return rows.map(toRecord);
  }

  async listUnused(): Promise<DependencyRecord[]> {
    const rows = await this.db(DEPS).where('unused', true).orderBy(['entity_ref', 'name']);
    return rows.map(toRecord);
  }

  async listOutdated(severity?: DriftSeverity): Promise<DependencyRecord[]> {
    const query = this.db(DEPS);
    if (severity) query.where('drift_severity', severity);
    else query.whereIn('drift_severity', OUTDATED_SEVERITIES);
    const rows = await query.orderBy(['name', 'entity_ref']);
    return rows.map(toRecord);
  }

  async getLibrary(name: string): Promise<LibrarySummary | undefined> {
    const rows = await this.db(DEPS).where('name', name);
    if (rows.length === 0) return undefined;

    const records = rows.map(toRecord);
    const usages: LibraryUsage[] = records.map(r => ({
      entityRef: r.entityRef,
      owner: r.owner,
      ecosystem: r.ecosystem,
      manifestPath: r.manifestPath,
      declaredVersion: r.declaredVersion,
      latestVersion: r.latestVersion,
      driftSeverity: r.driftSeverity,
      unused: r.unused,
    }));

    return {
      name,
      ecosystems: [...new Set(records.map(r => r.ecosystem))],
      latestVersion: records.find(r => r.latestVersion)?.latestVersion,
      versions: [...new Set(records.map(r => r.declaredVersion).filter(Boolean))],
      entityCount: new Set(records.map(r => r.entityRef)).size,
      usages,
    };
  }

  async getOccurrences(name: string, entityRef?: string): Promise<OccurrenceGroup[]> {
    // Left-join with status to attach the repo URL so the frontend can build VCS file links.
    const query = this.db(OCC)
      .join(DEPS, `${OCC}.dependency_id`, `${DEPS}.id`)
      .leftJoin(STATUS, `${DEPS}.entity_ref`, `${STATUS}.entity_ref`)
      .where(`${DEPS}.name`, name)
      .select(
        `${DEPS}.entity_ref as entity_ref`,
        `${DEPS}.manifest_path as manifest_path`,
        `${STATUS}.source_url as source_url`,
        `${OCC}.file_path as file_path`,
        `${OCC}.line as line`,
      )
      .orderBy([`${DEPS}.entity_ref`, `${OCC}.file_path`, `${OCC}.line`]);
    if (entityRef) query.where(`${DEPS}.entity_ref`, entityRef);

    const rows = await query;
    const groups = new Map<string, OccurrenceGroup>();
    for (const row of rows) {
      const key = `${row.entity_ref}::${row.manifest_path}`;
      const group: OccurrenceGroup =
        groups.get(key) ?? {
          entityRef: row.entity_ref,
          manifestPath: row.manifest_path,
          repoUrl: row.source_url ?? undefined,
          occurrences: [],
        };
      group.occurrences.push({ path: row.file_path, line: Number(row.line) });
      groups.set(key, group);
    }
    return [...groups.values()];
  }

  async getOverviewStats(): Promise<OverviewStats> {
    const [componentRow, totalRow, unusedRow, severityRows, ecosystemRows, topRows] = await Promise.all([
      this.db(STATUS).countDistinct('entity_ref as count').first(),
      this.db(DEPS).count('id as count').first(),
      this.db(DEPS).where('unused', true).count('id as count').first(),
      this.db(DEPS).select('drift_severity').count('id as count').groupBy('drift_severity'),
      this.db(DEPS).select('ecosystem').count('id as count').groupBy('ecosystem'),
      this.db(DEPS)
        .where('drift_severity', 'major')
        .select('entity_ref', 'owner')
        .count('id as major_count')
        .groupBy('entity_ref', 'owner')
        .orderBy('major_count', 'desc')
        .limit(10),
    ]);

    const byDriftSeverity: Record<DriftSeverity, number> = {
      major: 0, minor: 0, patch: 0, 'up-to-date': 0, unknown: 0,
    };
    for (const row of severityRows) {
      const sev = row.drift_severity as DriftSeverity;
      if (sev in byDriftSeverity) byDriftSeverity[sev] = Number(row.count);
    }

    const byEcosystem: Partial<Record<Ecosystem, number>> = {};
    for (const row of ecosystemRows) {
      byEcosystem[row.ecosystem as Ecosystem] = Number(row.count);
    }

    return {
      totalComponents: Number(componentRow?.count ?? 0),
      totalDependencies: Number(totalRow?.count ?? 0),
      unusedCount: Number(unusedRow?.count ?? 0),
      byDriftSeverity,
      byEcosystem,
      topAffected: topRows.map(r => ({
        entityRef: r.entity_ref as string,
        owner: (r.owner as string | null) ?? undefined,
        majorCount: Number(r.major_count),
      })),
    };
  }

  async duplicateVersions(): Promise<DuplicateVersionItem[]> {
    const rows = await this.db(DEPS).select('name', 'ecosystem', 'declared_version', 'entity_ref');

    // group: name+ecosystem -> version -> set(entityRef)
    const grouped = new Map<string, { name: string; ecosystem: Ecosystem; versions: Map<string, Set<string>> }>();
    for (const row of rows) {
      const key = `${row.name} ${row.ecosystem}`;
      const entry = grouped.get(key) ?? { name: row.name, ecosystem: row.ecosystem, versions: new Map() };
      const version = row.declared_version ?? '';
      const refs = entry.versions.get(version) ?? new Set<string>();
      refs.add(row.entity_ref);
      entry.versions.set(version, refs);
      grouped.set(key, entry);
    }

    return [...grouped.values()]
      .filter(entry => entry.versions.size > 1)
      .map(entry => ({
        name: entry.name,
        ecosystem: entry.ecosystem,
        versionCount: entry.versions.size,
        versions: [...entry.versions.entries()].map(([version, refs]) => ({ version, entityRefs: [...refs] })),
      }))
      .sort((a, b) => b.versionCount - a.versionCount);
  }

  private applyFilters(query: Knex.QueryBuilder, q: DependencyQuery): Knex.QueryBuilder {
    if (q.entityRef) query.where('entity_ref', q.entityRef);
    if (q.ecosystem) query.where('ecosystem', q.ecosystem);
    if (q.owner) query.where('owner', q.owner);
    if (q.severity) query.where('drift_severity', q.severity);
    if (q.unused) query.where('unused', true);
    if (q.outdated) query.whereIn('drift_severity', OUTDATED_SEVERITIES);
    return query;
  }
}
