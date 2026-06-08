# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Global coding principles (KISS, DRY, YAGNI, SRP, no God functions, early returns,
> readable, comment the *why*) live in the global `~/.claude/CLAUDE.md` and apply here too.

## Project

`backstage-plugin-library-tracker` — a Backstage plugin that gives an org-wide view of every
catalogued component's third-party libraries (versions, license, drift, unused deps) by
scanning each component's source repo via VCS APIs (no cloning), built on Backstage's
`UrlReaderService`.

## Structure & conventions (plugin style)

Standalone, publishable plugin packages in a yarn-workspace repo (consumed by an existing
Backstage app — this repo is not a full app):

- `packages/common` → `backstage-plugin-library-tracker-common` — isomorphic types + `apiRef` + DTOs.
- `packages/backend` → `backstage-plugin-library-tracker-backend` — **new backend system** module.
- `packages/frontend` → `backstage-plugin-library-tracker` — **legacy frontend plugin API** (max host-app compatibility).
- Each package ships a `dev/` harness so it runs without a host app.

Toolchain: Backstage CLI. Build `backstage-cli package build`, lint `… lint`, test `… test`;
root-wide via `backstage-cli repo build|lint|test`. tsconfig extends `@backstage/cli/config/tsconfig.json`.

Scanning is **VCS-API-only** via `UrlReaderService` (`readUrl`/`readTree`); incremental sync
uses the reader's **ETag → `NotModifiedError`** to skip repos with no new commits.

## Gotchas (project-specific — append as they happen)

Format: `- <date> — <what went wrong> → <the rule to follow now>`

<!-- Add entries below. Keep each to one line. -->

- 2026-06-07 — `fast-xml-parser` coerces numeric text/attrs by default, turning version "32.0" into number 32 → set `parseTagValue:false` + `parseAttributeValue:false` so version strings stay verbatim.
- 2026-06-07 — `@backstage/cli` 0.36 needs `jest`, `jest-environment-jsdom`, and `@types/jest` as explicit root devDependencies (no longer bundled).
- 2026-06-07 — Build is two-step: root `yarn tsc` emits `.d.ts` into `dist-types/`, then `backstage-cli package build` bundles. Root tsconfig must set `outDir: dist-types`, `rootDir: .`.
- 2026-06-08 — Backstage eslint forbids `import React` (automatic JSX runtime) but the base tsconfig ships `jsx: "react"` (classic, needs React in scope) → set `jsx: "react-jsx"` in the ROOT tsconfig (per-package overrides don't apply to the root `tsc` run); use named imports (`useState`, `ReactNode`) instead of `React.*`.
- 2026-06-08 — Each package needs its own `.eslintrc.js` (`require('@backstage/cli/config/eslint-factory')(__dirname)`); frontend tests need `src/setupTests.ts` importing `@testing-library/jest-dom`.
- 2026-06-08 — `yarn test` (`backstage-cli repo test`) defaults to watch mode and hangs in non-interactive runs → use `CI=true yarn test` or `--watchAll=false`.
