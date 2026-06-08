# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.1] - 2026-06-08

### Fixed

- **Publish pipeline** — switched from `yarn workspace publish` (fails in CI with no TTY) to `npm publish` with `working-directory`; requires a Classic Automation token as `NPM_TOKEN` to bypass 2FA non-interactively ([#18](https://github.com/mani1993/backstage-plugin-library-tracker/issues/17))
- **`backstage-cli package prepack`** — added missing `backstage.pluginPackages` field to all three `package.json` files; without it `npm publish` aborted during prepack

### Added

- **Per-package `README.md`** — each npm package (`common`, `backend`, `frontend`) now has its own README so the npm registry page shows documentation and install instructions
- **`keywords`** in all package manifests for npm discoverability (`backstage`, `backstage-plugin`, `dependency-management`, etc.)
- **Branch name enforcement** — CI check (`branch-name.yml`) validates that every PR branch uses a recognised prefix (`feature/`, `fix/`, `issue/`, `hotfix/`, `chore/`, `docs/`); `dependabot/*` and `dev` are exempt

### Changed

- Branching strategy section in `CONTRIBUTING.md` rewritten with a full table of branch types, hotfix workflow, and branch rules

---

## [0.1.0] - 2026-06-07

### Added

- Initial release of `backstage-plugin-library-tracker`, `backstage-plugin-library-tracker-backend`, and `backstage-plugin-library-tracker-common`
- VCS-API-only scanning via Backstage `UrlReaderService` — no cloning, works across GitHub, GitLab, Bitbucket, and Azure DevOps
- Incremental sync using ETags (`NotModifiedError`) — skips repositories with no new commits
- Dependency detection for **npm**, **Maven**, **Python**, and **NuGet** ecosystems behind a pluggable `EcosystemParser` interface
- Severity-graded version drift (`major` / `minor` / `patch` / `up-to-date` / `unknown`) with latest version and license from public registries
- Conservative unused-dependency detection with confidence scoring and code-occurrence viewer (file path + line)
- Duplicate-version report — same library pinned to conflicting versions across the org
- Org-wide frontend page (`LibraryTrackerPage`) with Overview, All dependencies, Package search, Outdated, Unused, Duplicate versions, and Scan status tabs
- Entity tab (`EntityLibraryTrackerContent`) with on-demand rescan
- System tab (`SystemLibraryTrackerContent`) aggregating all dependencies for a team's components
- REST API at `/api/library-tracker` with paginated dependency list, reverse package search, occurrence viewer, and scan management endpoints
- Automated npm publish via GitHub Actions on `v*` tag push
- Full branch protection on `main` and `dev`, CODEOWNERS, CodeQL, Dependabot, and secret scanning

---

[Unreleased]: https://github.com/mani1993/backstage-plugin-library-tracker/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/mani1993/backstage-plugin-library-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mani1993/backstage-plugin-library-tracker/releases/tag/v0.1.0
