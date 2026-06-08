import {
  RootConfigService,
  SchedulerServiceTaskScheduleDefinition,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';
import { readDurationFromConfig } from '@backstage/config';
import { durationToMilliseconds } from '@backstage/types';

/** Resolved, defaulted configuration for the backend. */
export interface LibraryTrackerConfig {
  schedule: SchedulerServiceTaskScheduleDefinition;
  concurrency: number;
  excludePaths?: string[];
  enableVersionCheck: boolean;
  cacheTtlMs: number;
}

const DEFAULT_SCHEDULE: SchedulerServiceTaskScheduleDefinition = {
  frequency: { hours: 6 },
  timeout: { minutes: 30 },
  initialDelay: { seconds: 30 },
};

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Read `libraryTracker.*` from app-config, applying defaults for anything omitted. */
export function readLibraryTrackerConfig(config: RootConfigService): LibraryTrackerConfig {
  const root = config.getOptionalConfig('libraryTracker');

  const schedule = root?.has('schedule')
    ? readSchedulerServiceTaskScheduleDefinitionFromConfig(root.getConfig('schedule'))
    : DEFAULT_SCHEDULE;

  const cacheTtlMs = root?.has('registry.cacheTtl')
    ? durationToMilliseconds(readDurationFromConfig(root, { key: 'registry.cacheTtl' }))
    : DEFAULT_CACHE_TTL_MS;

  return {
    schedule,
    concurrency: root?.getOptionalNumber('scan.concurrency') ?? 5,
    excludePaths: root?.getOptionalStringArray('scan.excludePaths'),
    enableVersionCheck: root?.getOptionalBoolean('registry.enableVersionCheck') ?? true,
    cacheTtlMs,
  };
}
