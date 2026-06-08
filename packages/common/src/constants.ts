/**
 * Stable identifiers shared by the backend and frontend so they agree on routes
 * and storage keys without importing each other.
 */

/** Backstage plugin id; also the backend route mount path (`/api/library-tracker`). */
export const LIBRARY_TRACKER_PLUGIN_ID = 'library-tracker';

/** Catalog annotations we read a component's repository location from, in priority order. */
export const SOURCE_LOCATION_ANNOTATIONS = [
  'backstage.io/source-location',
  'backstage.io/managed-by-location',
] as const;
