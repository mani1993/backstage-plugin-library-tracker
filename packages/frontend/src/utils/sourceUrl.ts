/**
 * Builds a direct VCS URL to a specific file+line from a repo tree URL.
 * Handles GitHub, GitLab, Bitbucket, and Azure DevOps URL patterns.
 * Returns undefined when the URL pattern is not recognised.
 */
export function buildSourceFileUrl(repoUrl: string, filePath: string, line: number): string | undefined {
  const base = repoUrl.replace(/\/$/, '');

  // GitHub: https://github.com/org/repo/tree/branch[/subpath]
  const ghTree = base.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+)\/tree\/([^/]+)(\/.*)?$/);
  if (ghTree) {
    const [, root, branch, sub] = ghTree;
    const prefix = sub ? `${sub.replace(/^\//, '')}/` : '';
    return `${root}/blob/${branch}/${prefix}${filePath}#L${line}`;
  }
  // GitHub bare repo URL (no tree path)
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(base)) {
    return `${base}/blob/main/${filePath}#L${line}`;
  }

  // GitLab: https://gitlab.com/org/repo/-/tree/branch[/subpath]
  const glTree = base.match(/^(https:\/\/gitlab\.com\/.+?)\/-\/tree\/([^/]+)(\/.*)?$/);
  if (glTree) {
    const [, root, branch, sub] = glTree;
    const prefix = sub ? `${sub.replace(/^\//, '')}/` : '';
    return `${root}/-/blob/${branch}/${prefix}${filePath}#L${line}`;
  }

  // Bitbucket: https://bitbucket.org/workspace/repo/src/branch[/subpath]
  const bbSrc = base.match(/^(https:\/\/bitbucket\.org\/[^/]+\/[^/]+)\/src\/([^/]+)(\/.*)?$/);
  if (bbSrc) {
    const [, root, branch, sub] = bbSrc;
    const prefix = sub ? `${sub.replace(/^\//, '')}/` : '';
    return `${root}/src/${branch}/${prefix}${filePath}#lines-${line}`;
  }

  // Azure DevOps: https://dev.azure.com/org/project/_git/repo
  if (/^https:\/\/dev\.azure\.com\/.+\/_git\/.+/.test(base)) {
    return `${base}?path=/${filePath}&line=${line}&lineEnd=${line + 1}&lineStartColumn=1&lineEndColumn=1`;
  }

  return undefined;
}
