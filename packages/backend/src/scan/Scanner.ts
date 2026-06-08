import { randomUUID } from 'crypto';
import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { NotModifiedError } from '@backstage/errors';
import {
  DependencyRecord,
  Ecosystem,
  ScanOutcome,
  ScanRun,
  ScanTrigger,
} from 'backstage-plugin-library-tracker-common';
import {
  DeclaredDependency,
  EcosystemParser,
  ImportRef,
  isUnused,
  manifestParserFor,
  sourceParserFor,
} from '../ecosystems';
import { RegistryClient, RegistryInfo, driftSeverity } from '../registry';
import { EntitySource } from '../catalog/EntitySource';
import { providerOf, resolveOwner, resolveSourceUrl } from '../catalog/sourceLocation';
import { LibraryTrackerStore, ScannedDependency } from '../store/types';
import { mapWithConcurrency } from './concurrency';

/** Directories never worth scanning for manifests or imports. */
// Build output and vendored deps only — never test dirs, or test-only devDeps look unused.
const DEFAULT_EXCLUDES = [
  'node_modules', 'target', 'dist', 'build', 'out', 'bin', 'obj', '.venv', 'venv', 'vendor', '.git',
];

type ReadTree = Awaited<ReturnType<UrlReaderService['readTree']>>;

interface ManifestFile {
  path: string;
  parser: EcosystemParser;
  content: string;
}

interface ParsedManifest {
  manifest: ManifestFile;
  deps: DeclaredDependency[];
}

export interface ScannerOptions {
  reader: UrlReaderService;
  registry: RegistryClient;
  store: LibraryTrackerStore;
  entities: EntitySource;
  logger: LoggerService;
  concurrency?: number;
  excludePaths?: string[];
}

const nowIso = () => new Date().toISOString();

/**
 * Scans component repositories for dependencies. The public surface is two triggers
 * (`scanAll`, `scanOne`); everything else is a small private step so no single method
 * grows into a god-function.
 */
export class Scanner {
  private readonly reader: UrlReaderService;
  private readonly registry: RegistryClient;
  private readonly store: LibraryTrackerStore;
  private readonly entities: EntitySource;
  private readonly logger: LoggerService;
  private readonly concurrency: number;
  private readonly excludes: Set<string>;

  constructor(options: ScannerOptions) {
    this.reader = options.reader;
    this.registry = options.registry;
    this.store = options.store;
    this.entities = options.entities;
    this.logger = options.logger;
    this.concurrency = Math.max(1, options.concurrency ?? 5);
    this.excludes = new Set(options.excludePaths ?? DEFAULT_EXCLUDES);
  }

  /** Scan every component in the catalog. */
  async scanAll(trigger: ScanTrigger = 'schedule'): Promise<ScanRun> {
    const components = await this.entities.listComponents();
    return this.runScan(trigger, components);
  }

  /** Scan a single component on demand. */
  async scanOne(entityRef: string): Promise<ScanRun> {
    const entity = await this.entities.getEntity(entityRef);
    if (!entity) this.logger.warn(`library-tracker: entity not found: ${entityRef}`);
    return this.runScan('manual', entity ? [entity] : []);
  }

  private async runScan(trigger: ScanTrigger, components: Entity[]): Promise<ScanRun> {
    const run: ScanRun = { id: randomUUID(), trigger, startedAt: nowIso(), scanned: 0, skipped: 0, failed: 0 };
    await this.store.insertRun(run);

    const outcomes = await mapWithConcurrency(components, this.concurrency, entity => this.scanEntity(entity));
    for (const outcome of outcomes) {
      if (outcome === 'ok') run.scanned++;
      else if (outcome === 'skipped') run.skipped++;
      else run.failed++;
    }

    run.finishedAt = nowIso();
    run.summary = `${run.scanned} scanned, ${run.skipped} skipped, ${run.failed} failed`;
    await this.store.updateRun(run);
    this.logger.info(`library-tracker: scan ${run.id} complete — ${run.summary}`);
    return run;
  }

  private async scanEntity(entity: Entity): Promise<ScanOutcome> {
    const entityRef = stringifyEntityRef(entity);
    const owner = resolveOwner(entity);
    const sourceUrl = resolveSourceUrl(entity);

    // Guard clause: nothing to fetch for components without a scannable location.
    if (!sourceUrl) {
      await this.store.upsertStatus({
        entityRef, owner, lastOutcome: 'skipped', lastError: 'no source location', lastScannedAt: nowIso(),
      });
      return 'skipped';
    }

    const prior = await this.store.getStatus(entityRef);
    const base = { entityRef, owner, sourceUrl, provider: providerOf(sourceUrl) };

    let tree: ReadTree;
    try {
      tree = await this.reader.readTree(sourceUrl, { etag: prior?.lastEtag });
    } catch (error) {
      // NotModifiedError means no new commits since last sync — the incremental fast path.
      if (error instanceof NotModifiedError) {
        await this.store.upsertStatus({ ...base, lastEtag: prior?.lastEtag, lastScannedAt: nowIso(), lastOutcome: 'skipped' });
        return 'skipped';
      }
      this.logger.warn(`library-tracker: failed to read ${entityRef} (${sourceUrl}): ${error}`);
      await this.store.upsertStatus({ ...base, lastEtag: prior?.lastEtag, lastScannedAt: nowIso(), lastOutcome: 'error', lastError: String(error) });
      return 'error';
    }

    try {
      const dependencies = await this.analyse(entityRef, owner, tree);
      await this.store.replaceEntityDependencies(entityRef, dependencies);
      await this.store.upsertStatus({ ...base, lastEtag: tree.etag, lastScannedAt: nowIso(), lastOutcome: 'ok' });
      return 'ok';
    } catch (error) {
      this.logger.warn(`library-tracker: failed to analyse ${entityRef}: ${error}`);
      await this.store.upsertStatus({ ...base, lastEtag: prior?.lastEtag, lastScannedAt: nowIso(), lastOutcome: 'error', lastError: String(error) });
      return 'error';
    }
  }

  private async analyse(entityRef: string, owner: string | undefined, tree: ReadTree): Promise<ScannedDependency[]> {
    const { manifests, importsByEcosystem } = await this.readTreeFiles(tree);
    if (manifests.length === 0) return [];

    const parsed = manifests.map(manifest => ({ manifest, deps: manifest.parser.parseManifest(manifest.path, manifest.content) }));
    const registryInfo = await this.fetchRegistryInfo(parsed);

    const dependencies: ScannedDependency[] = [];
    for (const { manifest, deps } of parsed) {
      const imports = importsByEcosystem.get(manifest.parser.ecosystem) ?? [];
      for (const dep of deps) {
        dependencies.push(this.buildDependency(entityRef, owner, manifest, dep, imports, registryInfo));
      }
    }
    return dependencies;
  }

  private buildDependency(
    entityRef: string,
    owner: string | undefined,
    manifest: ManifestFile,
    dep: DeclaredDependency,
    imports: ImportRef[],
    registryInfo: Map<string, RegistryInfo>,
  ): ScannedDependency {
    const { ecosystem } = manifest.parser;
    const usage = manifest.parser.matchDependency(dep, imports);
    const info = registryInfo.get(`${ecosystem}:${dep.name}`) ?? {};

    const record: DependencyRecord = {
      id: `${entityRef}|${manifest.path}|${ecosystem}|${dep.name}`,
      entityRef,
      owner,
      ecosystem,
      manifestPath: manifest.path,
      name: dep.name,
      declaredVersion: dep.version,
      scope: dep.scope,
      license: info.license,
      latestVersion: info.latestVersion,
      driftSeverity: driftSeverity(dep.version, info.latestVersion),
      used: usage.used,
      confidence: usage.confidence,
      unused: isUnused(usage),
    };
    return { record, occurrences: usage.occurrences };
  }

  /** Read manifests and source imports from the tree in one pass, skipping excluded paths. */
  private async readTreeFiles(tree: ReadTree): Promise<{
    manifests: ManifestFile[];
    importsByEcosystem: Map<Ecosystem, ImportRef[]>;
  }> {
    const files = await tree.files();
    const manifests: ManifestFile[] = [];
    const importsByEcosystem = new Map<Ecosystem, ImportRef[]>();

    await mapWithConcurrency(files, this.concurrency, async file => {
      if (this.isExcluded(file.path)) return;
      const manifestParser = manifestParserFor(file.path);
      const sourceParser = sourceParserFor(file.path);
      if (!manifestParser && !sourceParser) return;

      const content = (await file.content()).toString('utf8');
      // The block below has no awaits, so concurrent workers never interleave these mutations.
      if (manifestParser) {
        manifests.push({ path: file.path, parser: manifestParser, content });
      }
      if (sourceParser) {
        const refs = sourceParser.extractImports({ path: file.path, content });
        const existing = importsByEcosystem.get(sourceParser.ecosystem) ?? [];
        existing.push(...refs);
        importsByEcosystem.set(sourceParser.ecosystem, existing);
      }
    });

    return { manifests, importsByEcosystem };
  }

  /** Fetch registry data once per unique (ecosystem, name) across all manifests. */
  private async fetchRegistryInfo(parsed: ParsedManifest[]): Promise<Map<string, RegistryInfo>> {
    const unique = new Map<string, { ecosystem: Ecosystem; name: string }>();
    for (const { manifest, deps } of parsed) {
      for (const dep of deps) {
        unique.set(`${manifest.parser.ecosystem}:${dep.name}`, { ecosystem: manifest.parser.ecosystem, name: dep.name });
      }
    }

    const entries = [...unique.entries()];
    const infos = await mapWithConcurrency(entries, this.concurrency, ([, value]) =>
      this.registry.fetchInfo(value.ecosystem, value.name),
    );

    const result = new Map<string, RegistryInfo>();
    entries.forEach(([key], index) => result.set(key, infos[index]));
    return result;
  }

  private isExcluded(path: string): boolean {
    return path.split('/').some(segment => this.excludes.has(segment));
  }
}
