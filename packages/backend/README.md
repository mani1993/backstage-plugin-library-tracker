# backstage-plugin-library-tracker-backend

> Backend plugin for [Library Tracker](https://github.com/mani1993/backstage-plugin-library-tracker) — scans every catalogued component's repository for third-party dependencies via VCS APIs, with no cloning required.

![Backstage](https://img.shields.io/badge/Backstage-new%20backend%20system-6E4BF4)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/npm/v/backstage-plugin-library-tracker-backend)

## Install

```bash
yarn --cwd packages/backend add backstage-plugin-library-tracker-backend
```

**`packages/backend/src/index.ts`:**

```ts
backend.add(import('backstage-plugin-library-tracker-backend'));
```

## What it does

- Resolves each `Component`'s source repository from `backstage.io/source-location`
- Scans via `UrlReaderService` (GitHub, GitLab, Bitbucket, Azure DevOps) — no cloning
- Incremental sync using ETags — skips repositories with no new commits
- Detects declared dependencies, version drift, license, and unused imports
- Exposes a REST API at `/api/library-tracker`

## Supported ecosystems

| Ecosystem | Manifests | Unused detection |
|-----------|-----------|-----------------|
| npm / Node | `package.json` | ✅ high confidence |
| Python | `requirements*.txt`, `pyproject.toml`, `Pipfile` | ✅ high confidence |
| Maven / Java | `pom.xml` | ⚠️ used-only |
| NuGet / C# | `*.csproj`, `packages.config` | ⚠️ used-only |

## Configuration

```yaml
libraryTracker:
  schedule:
    frequency: { hours: 6 }
    timeout: { minutes: 30 }
  scan:
    concurrency: 5
    excludePaths: [node_modules, target, dist, .venv, vendor]
  registry:
    enableVersionCheck: true
    cacheTtl: { hours: 24 }
```

## Full documentation

See the [main repository README](https://github.com/mani1993/backstage-plugin-library-tracker) for full setup, configuration, screenshots, and API reference.

## License

MIT
