import { Entity } from '@backstage/catalog-model';
import { SOURCE_LOCATION_ANNOTATIONS } from 'backstage-plugin-library-tracker-common';

/**
 * Catalog locations are written as `<type>:<target>`. Only `url:` (and bare http) locations
 * point at something the UrlReader can fetch a tree from; `file:` and others can't be scanned.
 */
function stripLocationType(value: string): string | undefined {
  if (value.startsWith('url:')) return value.slice('url:'.length) || undefined;
  if (/^https?:\/\//.test(value)) return value;
  return undefined;
}

/** Resolve a component's scannable repository URL from its catalog annotations, if any. */
export function resolveSourceUrl(entity: Entity): string | undefined {
  const annotations = entity.metadata.annotations ?? {};
  for (const key of SOURCE_LOCATION_ANNOTATIONS) {
    const value = annotations[key];
    if (value) {
      const url = stripLocationType(value);
      if (url) return url;
    }
  }
  return undefined;
}

/** The entity's owner reference, carried through for owner-grouped views. */
export function resolveOwner(entity: Entity): string | undefined {
  const owner = (entity.spec as { owner?: unknown } | undefined)?.owner;
  return typeof owner === 'string' && owner ? owner : undefined;
}

/** Best-effort VCS provider name from a repo URL, for display/status. */
export function providerOf(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.includes('github')) return 'github';
    if (host.includes('gitlab')) return 'gitlab';
    if (host.includes('bitbucket')) return 'bitbucket';
    if (host.includes('azure') || host.includes('visualstudio')) return 'azure';
    return host;
  } catch {
    return 'unknown';
  }
}
