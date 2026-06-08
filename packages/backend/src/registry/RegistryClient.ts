import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { JsonObject } from '@backstage/types';
import { Ecosystem } from 'backstage-plugin-library-tracker-common';

/** Latest published version and license for a library, as far as the registry reveals. */
export interface RegistryInfo {
  latestVersion?: string;
  license?: string;
}

export interface RegistryClient {
  /** Look up registry data for a library; never throws (returns `{}` on failure). */
  fetchInfo(ecosystem: Ecosystem, name: string): Promise<RegistryInfo>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegistryClientOptions {
  logger: LoggerService;
  cache?: CacheService;
  /** Cache TTL in milliseconds. */
  ttlMs?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** Coerce npm's `license` field, which may be a string or `{ type }` object, to a string. */
function licenseToString(license: unknown): string | undefined {
  if (typeof license === 'string') return license || undefined;
  if (license && typeof license === 'object' && 'type' in license) {
    return String((license as { type: unknown }).type) || undefined;
  }
  return undefined;
}

/**
 * Fetches latest-version and license metadata from the public registries, with caching.
 * Each ecosystem has a tiny dedicated fetcher; failures degrade to empty info so a flaky
 * registry never fails a scan.
 */
export class DefaultRegistryClient implements RegistryClient {
  private readonly logger: LoggerService;
  private readonly cache?: CacheService;
  private readonly ttlMs: number;
  private readonly fetchImpl: typeof fetch;

  private readonly fetchers: Record<Ecosystem, (name: string) => Promise<RegistryInfo>> = {
    npm: name => this.npmInfo(name),
    python: name => this.pypiInfo(name),
    maven: name => this.mavenInfo(name),
    nuget: name => this.nugetInfo(name),
  };

  constructor(options: RegistryClientOptions) {
    this.logger = options.logger;
    this.cache = options.cache;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchInfo(ecosystem: Ecosystem, name: string): Promise<RegistryInfo> {
    const key = `lt:reg:${ecosystem}:${name}`;

    // Cache stores/returns plain JSON; RegistryInfo is JSON-shaped so the casts are safe.
    const cached = (await this.cache?.get(key)) as RegistryInfo | undefined;
    if (cached) return cached;

    try {
      const info = await this.fetchers[ecosystem](name);
      await this.cache?.set(key, info as unknown as JsonObject, { ttl: this.ttlMs });
      return info;
    } catch (error) {
      this.logger.debug(`Registry lookup failed for ${ecosystem}:${name}: ${error}`);
      return {};
    }
  }

  private async getJson(url: string): Promise<any> {
    const response = await this.fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  }

  private async npmInfo(name: string): Promise<RegistryInfo> {
    // Scoped names must keep their slash encoded for the registry path.
    const data = await this.getJson(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
    const latest = data['dist-tags']?.latest;
    return {
      latestVersion: latest,
      license: licenseToString(data.license ?? data.versions?.[latest]?.license),
    };
  }

  private async pypiInfo(name: string): Promise<RegistryInfo> {
    const data = await this.getJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    return { latestVersion: data.info?.version, license: data.info?.license || undefined };
  }

  private async mavenInfo(name: string): Promise<RegistryInfo> {
    const [group, artifact] = name.split(':');
    if (!group || !artifact) return {};
    const url =
      `https://search.maven.org/solrsearch/select?q=g:"${group}"+AND+a:"${artifact}"` +
      `&core=gav&rows=1&wt=json`;
    const data = await this.getJson(url);
    return { latestVersion: data.response?.docs?.[0]?.v };
  }

  private async nugetInfo(name: string): Promise<RegistryInfo> {
    const id = name.toLowerCase();
    const data = await this.getJson(`https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(id)}/index.json`);
    const versions: string[] = data.versions ?? [];
    return { latestVersion: versions[versions.length - 1] };
  }
}
