import { SchedulerServiceTaskScheduleDefinitionConfig } from '@backstage/backend-plugin-api';
import { HumanDuration } from '@backstage/types';

export interface Config {
  /** Configuration for the library-tracker plugin. */
  libraryTracker?: {
    /** Schedule for the org-wide dependency scan. Defaults to every 6 hours. */
    schedule?: SchedulerServiceTaskScheduleDefinitionConfig;

    scan?: {
      /** Maximum repositories scanned in parallel. Default 5. */
      concurrency?: number;
      /** Directory names skipped while scanning (e.g. node_modules, target). */
      excludePaths?: string[];
    };

    registry?: {
      /** Look up latest versions and licenses from public registries. Default true. */
      enableVersionCheck?: boolean;
      /** How long registry lookups are cached. Default 24h. */
      cacheTtl?: HumanDuration | string;
    };
  };
}
