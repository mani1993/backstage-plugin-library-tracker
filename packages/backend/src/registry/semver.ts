import semver from 'semver';
import { DriftSeverity } from 'backstage-plugin-library-tracker-common';

/**
 * Classify how far a declared version trails the latest published version.
 *
 * Declared specs are messy (`^1.2.0`, `~1.2`, `>=1.0`, `${prop}`), so we coerce both sides
 * to a concrete version before comparing. When either side can't be understood we return
 * `unknown` rather than guess.
 */
export function driftSeverity(declared: string, latest?: string): DriftSeverity {
  if (!latest) return 'unknown';

  const current = semver.coerce(declared);
  const target = semver.coerce(latest);
  if (!current || !target) return 'unknown';

  // Declared at or beyond latest (pinned ahead, or pre-release of latest) counts as current.
  if (semver.gte(current, target)) return 'up-to-date';

  switch (semver.diff(current, target)) {
    case 'major':
    case 'premajor':
      return 'major';
    case 'minor':
    case 'preminor':
      return 'minor';
    case 'patch':
    case 'prepatch':
    case 'prerelease':
      return 'patch';
    default:
      return 'up-to-date';
  }
}

/** True when a dependency is behind its latest release (any non-current, known severity). */
export function isOutdated(severity: DriftSeverity): boolean {
  return severity === 'major' || severity === 'minor' || severity === 'patch';
}
