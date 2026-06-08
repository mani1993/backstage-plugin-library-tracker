import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { LIBRARY_TRACKER_PLUGIN_ID } from 'backstage-plugin-library-tracker-common';
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
import { LibraryTrackerApi } from './LibraryTrackerApi';

/** Build a `?a=b` string from defined, non-empty query values. */
function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** REST client for the library-tracker backend, talking through Backstage discovery/fetch. */
export class LibraryTrackerClient implements LibraryTrackerApi {
  constructor(
    private readonly options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi },
  ) {}

  private async baseUrl(): Promise<string> {
    return this.options.discoveryApi.getBaseUrl(LIBRARY_TRACKER_PLUGIN_ID);
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.options.fetchApi.fetch(`${await this.baseUrl()}${path}`);
    if (!response.ok) throw await ResponseError.fromResponse(response);
    return response.json() as Promise<T>;
  }

  async listDependencies(query: DependencyQuery = {}): Promise<DependencyListResponse> {
    return this.get(`/dependencies${toQueryString({ ...query })}`);
  }

  async listEntityDependencies(entityRef: string): Promise<DependencyRecord[]> {
    const [kind, rest] = entityRef.split(':');
    const [namespace, name] = rest.split('/');
    return this.get(`/entities/${namespace}/${kind}/${name}/dependencies`);
  }

  async lookupLibrary(name: string): Promise<LibrarySummary | undefined> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/libraries/lookup${toQueryString({ name })}`,
    );
    if (response.status === 404) return undefined;
    if (!response.ok) throw await ResponseError.fromResponse(response);
    return response.json();
  }

  async getOccurrences(name: string, entityRef?: string): Promise<OccurrenceGroup[]> {
    return this.get(`/libraries/occurrences${toQueryString({ name, entityRef })}`);
  }

  async duplicates(): Promise<DuplicateVersionItem[]> {
    return this.get('/reports/duplicates');
  }

  async unused(): Promise<DependencyRecord[]> {
    return this.get('/reports/unused');
  }

  async outdated(severity?: DriftSeverity): Promise<DependencyRecord[]> {
    return this.get(`/reports/outdated${toQueryString({ severity })}`);
  }

  async status(): Promise<ScanStatus[]> {
    return (await this.get<{ items: ScanStatus[] }>('/scan/status')).items;
  }

  async runs(): Promise<ScanRun[]> {
    return (await this.get<{ items: ScanRun[] }>('/scan/runs')).items;
  }

  async refresh(entityRef?: string): Promise<RefreshResponse> {
    const response = await this.options.fetchApi.fetch(`${await this.baseUrl()}/scan/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entityRef }),
    });
    if (!response.ok) throw await ResponseError.fromResponse(response);
    return response.json();
  }

  async getOverviewStats(): Promise<OverviewStats> {
    return this.get('/reports/overview');
  }
}
