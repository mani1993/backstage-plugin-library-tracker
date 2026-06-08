import { ImportRef, SourceFile } from './types';

/** 1-based line number of a character offset within text. */
export function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Run a global regex over a source file, yielding an ImportRef for each match.
 * `pick` maps a match to the imported token, or undefined to skip it (e.g. relative paths).
 */
export function importsFromRegex(
  source: SourceFile,
  regex: RegExp,
  pick: (match: RegExpExecArray) => string | undefined,
): ImportRef[] {
  const refs: ImportRef[] = [];
  // Reset in case a shared regex object is passed in.
  regex.lastIndex = 0;
  for (let match = regex.exec(source.content); match !== null; match = regex.exec(source.content)) {
    const moduleToken = pick(match);
    if (moduleToken) {
      refs.push({ module: moduleToken, path: source.path, line: lineAt(source.content, match.index) });
    }
    if (match.index === regex.lastIndex) regex.lastIndex++; // guard against zero-width matches
  }
  return refs;
}

/** Lowercase file extension including the dot, e.g. `.ts`. Empty string when none. */
export function extOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

/** Final path segment, e.g. `pom.xml`. */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
