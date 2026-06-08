import { DependencyScope } from 'backstage-plugin-library-tracker-common';
import { DeclaredDependency, EcosystemParser, ImportRef, SourceFile, UsageResult, toOccurrences } from './types';
import { baseName, extOf, importsFromRegex } from './util';
import { toArray, xmlParser } from './xml';

const SOURCE_EXTENSIONS = new Set(['.java', '.kt']);

/** `import com.foo.Bar;` / `import static com.foo.Bar.baz;` — captures the dotted FQN. */
const IMPORT_REGEX = /^[ \t]*import[ \t]+(?:static[ \t]+)?([\w.]+)/gm;

/** Maven scopes that mean "not shipped to production". */
const NON_PROD_SCOPES = new Set(['test', 'provided']);

/** Resolve a `${property}` version against the pom's <properties>, else return it unchanged. */
function resolveVersion(version: unknown, properties: Record<string, unknown>): string {
  const raw = version === undefined || version === null ? '' : String(version);
  const match = raw.match(/^\$\{(.+)\}$/);
  if (match && properties[match[1]] !== undefined) return String(properties[match[1]]);
  return raw;
}

export class MavenParser implements EcosystemParser {
  readonly ecosystem = 'maven' as const;

  ownsManifest(path: string): boolean {
    return baseName(path) === 'pom.xml';
  }

  ownsSource(path: string): boolean {
    return SOURCE_EXTENSIONS.has(extOf(path));
  }

  parseManifest(_path: string, content: string): DeclaredDependency[] {
    const doc = xmlParser.parse(content);
    const project = doc.project ?? {};
    const properties = (project.properties as Record<string, unknown>) ?? {};
    const dependencies = toArray<any>(project.dependencies?.dependency);

    return dependencies
      .filter(dep => dep?.groupId && dep?.artifactId)
      .map(dep => {
        const scope: DependencyScope = NON_PROD_SCOPES.has(String(dep.scope)) ? 'dev' : 'prod';
        return {
          name: `${dep.groupId}:${dep.artifactId}`,
          version: resolveVersion(dep.version, properties),
          scope,
        };
      });
  }

  extractImports(source: SourceFile): ImportRef[] {
    return importsFromRegex(source, IMPORT_REGEX, m => m[1].replace(/\.$/, ''));
  }

  matchDependency(dep: DeclaredDependency, imports: ImportRef[]): UsageResult {
    // groupId is only a best-effort proxy for the base package; many libs differ (e.g. guava).
    const groupId = dep.name.split(':')[0];
    const matched = imports.filter(i => i.module === groupId || i.module.startsWith(`${groupId}.`));
    const used = matched.length > 0;
    // Finding an import is decent evidence of use; its absence is weak (reflection, SPI, DI).
    return { used, confidence: used ? 0.6 : 0.35, occurrences: toOccurrences(matched) };
  }
}
