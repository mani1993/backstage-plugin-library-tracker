import * as TOML from '@iarna/toml';
import { DependencyScope } from 'backstage-plugin-library-tracker-common';
import { DeclaredDependency, EcosystemParser, ImportRef, SourceFile, UsageResult, toOccurrences } from './types';
import { baseName, extOf, importsFromRegex } from './util';

/** `import foo.bar` and `from foo.bar import baz` — captures the dotted module path. */
const IMPORT_REGEX = /^[ \t]*(?:from[ \t]+([.\w]+)[ \t]+import|import[ \t]+([.\w]+))/gm;

/**
 * Distribution names whose import name differs from the package name. Only the common,
 * non-derivable cases — everything else falls back to the normalised name.
 */
const IMPORT_NAME_MAP: Record<string, string[]> = {
  pyyaml: ['yaml'],
  beautifulsoup4: ['bs4'],
  pillow: ['PIL'],
  'scikit-learn': ['sklearn'],
  'opencv-python': ['cv2'],
  'python-dateutil': ['dateutil'],
  'msgpack-python': ['msgpack'],
  'attrs': ['attr', 'attrs'],
  'setuptools': ['setuptools', 'pkg_resources'],
};

/** PEP 503 name normalisation: lowercase, collapse runs of -_. into a single dash. */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[-_.]+/g, '-');
}

/** Strip extras and version specifiers from a requirement line, returning the bare name + spec. */
function parseRequirementLine(line: string): DeclaredDependency | undefined {
  const stripped = line.split('#')[0].trim();
  if (!stripped || stripped.startsWith('-')) return undefined; // options like -r, -e, --hash
  const match = stripped.match(/^([A-Za-z0-9._-]+)\s*(?:\[[^\]]*\])?\s*(.*)$/);
  if (!match) return undefined;
  return { name: normalize(match[1]), version: match[2].trim(), scope: 'prod' };
}

/** Candidate top-level import names a distribution could expose. */
function expectedImports(distName: string): string[] {
  const normalized = normalize(distName);
  return IMPORT_NAME_MAP[normalized] ?? [normalized.replace(/-/g, '_')];
}

function dependenciesFromTable(
  table: Record<string, unknown> | undefined,
  scope: DependencyScope,
): DeclaredDependency[] {
  if (!table) return [];
  return Object.entries(table)
    .filter(([name]) => normalize(name) !== 'python')
    .map(([name, spec]) => ({
      name: normalize(name),
      version: typeof spec === 'string' ? spec : '',
      scope,
    }));
}

export class PythonParser implements EcosystemParser {
  readonly ecosystem = 'python' as const;

  ownsManifest(path: string): boolean {
    const name = baseName(path).toLowerCase();
    return name === 'pyproject.toml' || name === 'pipfile' || /^requirements.*\.txt$/.test(name);
  }

  ownsSource(path: string): boolean {
    return extOf(path) === '.py';
  }

  parseManifest(path: string, content: string): DeclaredDependency[] {
    const name = baseName(path).toLowerCase();
    if (name === 'pyproject.toml') return this.parsePyproject(content);
    if (name === 'pipfile') return this.parsePipfile(content);
    return this.parseRequirements(name, content);
  }

  private parseRequirements(fileName: string, content: string): DeclaredDependency[] {
    const scope: DependencyScope = /dev|test/.test(fileName) ? 'dev' : 'prod';
    return content
      .split('\n')
      .map(parseRequirementLine)
      .filter((d): d is DeclaredDependency => Boolean(d))
      .map(d => ({ ...d, scope }));
  }

  private parsePyproject(content: string): DeclaredDependency[] {
    const doc = TOML.parse(content) as any;
    const deps: DeclaredDependency[] = [];

    // PEP 621: [project] dependencies = ["flask>=2", ...]
    for (const entry of (doc.project?.dependencies as string[]) ?? []) {
      const parsed = parseRequirementLine(entry);
      if (parsed) deps.push(parsed);
    }
    // PEP 621 optional groups: [project.optional-dependencies]
    for (const group of Object.values(doc.project?.['optional-dependencies'] ?? {})) {
      for (const entry of (group as string[]) ?? []) {
        const parsed = parseRequirementLine(entry);
        if (parsed) deps.push({ ...parsed, scope: 'optional' });
      }
    }
    // Poetry: [tool.poetry.dependencies] and dev groups
    deps.push(...dependenciesFromTable(doc.tool?.poetry?.dependencies, 'prod'));
    deps.push(...dependenciesFromTable(doc.tool?.poetry?.['dev-dependencies'], 'dev'));
    for (const group of Object.values(doc.tool?.poetry?.group ?? {})) {
      deps.push(...dependenciesFromTable((group as any)?.dependencies, 'dev'));
    }
    return deps;
  }

  private parsePipfile(content: string): DeclaredDependency[] {
    const doc = TOML.parse(content) as any;
    return [
      ...dependenciesFromTable(doc.packages, 'prod'),
      ...dependenciesFromTable(doc['dev-packages'], 'dev'),
    ];
  }

  extractImports(source: SourceFile): ImportRef[] {
    // Keep only the top-level package of a dotted path (e.g. `os.path` -> `os`).
    return importsFromRegex(source, IMPORT_REGEX, m => (m[1] ?? m[2])?.split('.')[0]);
  }

  matchDependency(dep: DeclaredDependency, imports: ImportRef[]): UsageResult {
    const candidates = new Set(expectedImports(dep.name));
    const matched = imports.filter(i => candidates.has(i.module));
    const used = matched.length > 0;
    // Mapping is good but imperfect (namespace packages, extras), so slightly lower confidence.
    return { used, confidence: used ? 0.85 : 0.7, occurrences: toOccurrences(matched) };
  }
}
