import { DependencyScope } from 'backstage-plugin-library-tracker-common';
import { DeclaredDependency, EcosystemParser, ImportRef, SourceFile, UsageResult, toOccurrences } from './types';
import { baseName, extOf, importsFromRegex } from './util';

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);

/** Matches `from 'x'`, `require('x')`, `import('x')` and side-effect `import 'x'`. */
const IMPORT_REGEX = /(?:\bfrom\s+|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;

/** package.json sections mapped to a normalised scope, in priority order (first wins). */
const MANIFEST_SECTIONS: Array<[string, DependencyScope]> = [
  ['dependencies', 'prod'],
  ['peerDependencies', 'peer'],
  ['optionalDependencies', 'optional'],
  ['devDependencies', 'dev'],
];

/** Reduce a module specifier to its installable package root, or undefined if not a package. */
function packageRoot(specifier: string): string | undefined {
  // Relative, absolute and Node builtins are never npm dependencies.
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) {
    return undefined;
  }
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined;
  }
  return parts[0] || undefined;
}

export class NpmParser implements EcosystemParser {
  readonly ecosystem = 'npm' as const;

  ownsManifest(path: string): boolean {
    return baseName(path) === 'package.json';
  }

  ownsSource(path: string): boolean {
    return SOURCE_EXTENSIONS.has(extOf(path));
  }

  parseManifest(_path: string, content: string): DeclaredDependency[] {
    const pkg = JSON.parse(content) as Record<string, Record<string, string> | undefined>;
    const seen = new Map<string, DeclaredDependency>();

    for (const [section, scope] of MANIFEST_SECTIONS) {
      const entries = pkg[section];
      if (!entries) continue;
      for (const [name, version] of Object.entries(entries)) {
        if (!seen.has(name)) {
          seen.set(name, { name, version: String(version ?? ''), scope });
        }
      }
    }
    return [...seen.values()];
  }

  extractImports(source: SourceFile): ImportRef[] {
    return importsFromRegex(source, IMPORT_REGEX, m => packageRoot(m[1]));
  }

  matchDependency(dep: DeclaredDependency, imports: ImportRef[]): UsageResult {
    const matched = imports.filter(i => i.module === dep.name);
    const used = matched.length > 0;
    // npm name↔import mapping is exact, so both presence and absence are high-confidence.
    return { used, confidence: used ? 0.95 : 0.9, occurrences: toOccurrences(matched) };
  }
}
