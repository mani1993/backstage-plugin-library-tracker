import { createRouteRef } from '@backstage/core-plugin-api';

/** Org-wide library-tracker page. */
export const rootRouteRef = createRouteRef({ id: 'library-tracker' });

/** Per-entity dependencies tab (Component). */
export const entityContentRouteRef = createRouteRef({ id: 'library-tracker:entity-content' });

/** Per-system dependencies tab (System / Resource). */
export const systemContentRouteRef = createRouteRef({ id: 'library-tracker:system-content' });
