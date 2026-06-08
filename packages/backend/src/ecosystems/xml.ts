import { XMLParser } from 'fast-xml-parser';

/**
 * Shared XML parser. Keeps attributes (PackageReference Include/Version live there) and
 * disables value coercion so version strings like "32.0" stay strings, not numbers.
 */
export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: () => false,
});

/** Normalise fast-xml-parser output (single object | array | undefined) to an array. */
export function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
