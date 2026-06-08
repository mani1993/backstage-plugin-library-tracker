import { DeclaredDependency, EcosystemParser, ImportRef, SourceFile, UsageResult, toOccurrences } from './types';
import { baseName, extOf, importsFromRegex } from './util';
import { toArray, xmlParser } from './xml';

/** `using System.Text;` / `global using Foo.Bar;` — captures the namespace FQN. */
const IMPORT_REGEX = /^[ \t]*(?:global[ \t]+)?using[ \t]+(?:static[ \t]+)?([\w.]+)[ \t]*;/gm;

export class NugetParser implements EcosystemParser {
  readonly ecosystem = 'nuget' as const;

  ownsManifest(path: string): boolean {
    const name = baseName(path).toLowerCase();
    return name.endsWith('.csproj') || name === 'packages.config';
  }

  ownsSource(path: string): boolean {
    return extOf(path) === '.cs';
  }

  parseManifest(path: string, content: string): DeclaredDependency[] {
    const doc = xmlParser.parse(content);
    return baseName(path).toLowerCase() === 'packages.config'
      ? this.parsePackagesConfig(doc)
      : this.parseCsproj(doc);
  }

  private parseCsproj(doc: any): DeclaredDependency[] {
    // PackageReference entries live across one or more <ItemGroup> elements.
    return toArray<any>(doc.Project?.ItemGroup)
      .flatMap(group => toArray<any>(group?.PackageReference))
      .filter(ref => ref?.['@_Include'])
      .map(ref => ({
        name: String(ref['@_Include']),
        version: String(ref['@_Version'] ?? ref.Version ?? ''),
        scope: 'prod' as const,
      }));
  }

  private parsePackagesConfig(doc: any): DeclaredDependency[] {
    return toArray<any>(doc.packages?.package)
      .filter(pkg => pkg?.['@_id'])
      .map(pkg => ({
        name: String(pkg['@_id']),
        version: String(pkg['@_version'] ?? ''),
        scope: 'prod' as const,
      }));
  }

  extractImports(source: SourceFile): ImportRef[] {
    return importsFromRegex(source, IMPORT_REGEX, m => m[1]);
  }

  matchDependency(dep: DeclaredDependency, imports: ImportRef[]): UsageResult {
    // .NET namespaces frequently equal the package id (e.g. Newtonsoft.Json), but not always.
    const matched = imports.filter(i => i.module === dep.name || i.module.startsWith(`${dep.name}.`));
    const used = matched.length > 0;
    return { used, confidence: used ? 0.6 : 0.4, occurrences: toOccurrences(matched) };
  }
}
