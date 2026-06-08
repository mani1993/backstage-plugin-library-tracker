import { EcosystemParser } from './types';
import { NpmParser } from './npm';
import { PythonParser } from './python';
import { MavenParser } from './maven';
import { NugetParser } from './nuget';

/** All parsers enabled in v1. Add new ecosystems here. */
export const PARSERS: readonly EcosystemParser[] = [
  new NpmParser(),
  new PythonParser(),
  new MavenParser(),
  new NugetParser(),
];

/** The parser that owns a manifest file, if any. */
export function manifestParserFor(path: string): EcosystemParser | undefined {
  return PARSERS.find(parser => parser.ownsManifest(path));
}

/** The parser that should analyse a source file, if any. */
export function sourceParserFor(path: string): EcosystemParser | undefined {
  return PARSERS.find(parser => parser.ownsSource(path));
}

export * from './types';
export { NpmParser } from './npm';
export { PythonParser } from './python';
export { MavenParser } from './maven';
export { NugetParser } from './nuget';
