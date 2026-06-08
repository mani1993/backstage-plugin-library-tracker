import { DependencyScope, Ecosystem, Occurrence } from 'backstage-plugin-library-tracker-common';

/** A dependency exactly as declared in a manifest, before any enrichment. */
export interface DeclaredDependency {
  name: string;
  /** Raw version spec as written in the manifest (e.g. `^1.2.0`, `1.2.0`, `${prop}`). */
  version: string;
  scope: DependencyScope;
}

/** A source file fetched from the repository tree, ready for usage analysis. */
export interface SourceFile {
  /** Repository-relative path. */
  path: string;
  content: string;
}

/** One import/usage reference extracted from a source file. */
export interface ImportRef {
  /** The imported token, normalised per ecosystem (package root, namespace, or FQN). */
  module: string;
  path: string;
  line: number;
}

/** Result of matching a declared dependency against a repository's imports. */
export interface UsageResult {
  used: boolean;
  /** Certainty of this determination (0..1); lower for ecosystems with weak name↔import mapping. */
  confidence: number;
  occurrences: Occurrence[];
}

/**
 * Parses one ecosystem's manifests and analyses source usage. Implementations must be
 * pure (no I/O) so they are trivially testable; the scanner handles all fetching.
 */
export interface EcosystemParser {
  readonly ecosystem: Ecosystem;

  /** True when this parser owns the given manifest file. */
  ownsManifest(path: string): boolean;

  /** True when this parser should analyse the given source file for imports. */
  ownsSource(path: string): boolean;

  parseManifest(path: string, content: string): DeclaredDependency[];

  extractImports(source: SourceFile): ImportRef[];

  matchDependency(dep: DeclaredDependency, imports: ImportRef[]): UsageResult;
}

/**
 * A dependency is only flagged `unused` when we are reasonably sure: absence of an import
 * is strong evidence for npm/python but weak for maven/nuget (reflection, DI, codegen).
 * Below this confidence we leave it unflagged rather than raise a false positive.
 */
export const UNUSED_CONFIDENCE_THRESHOLD = 0.6;

/** Derive the conservative `unused` flag from a usage result. */
export function isUnused(usage: UsageResult): boolean {
  return !usage.used && usage.confidence >= UNUSED_CONFIDENCE_THRESHOLD;
}

/** Map matched imports to serialisable occurrences. */
export function toOccurrences(imports: ImportRef[]): Occurrence[] {
  return imports.map(i => ({ path: i.path, line: i.line }));
}

export type { Ecosystem, DependencyScope, Occurrence };
