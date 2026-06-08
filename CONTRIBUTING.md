# Contributing

Thanks for helping improve **backstage-plugin-library-tracker**! This guide covers how to get
set up, the rules we hold code to, and how to ship a change.

## Ground rules

- **Be respectful and constructive.** Assume good intent.
- **One concern per PR.** Small, focused changes get reviewed and merged faster.
- **Discuss large changes first.** Open an issue or discussion before a big refactor or a new
  ecosystem so we can agree on the approach.
- **Never commit secrets.** Tokens and `*.local.yaml` files stay out of git (see `.gitignore`).

## Development setup

Requires Node 20 or 22 and Yarn 1.

```bash
yarn install
yarn tsc          # emit declaration files into dist-types/

# run the standalone dev harnesses (no host app needed):
yarn workspace backstage-plugin-library-tracker-backend start   # backend on :7007 (mock catalog)
yarn workspace backstage-plugin-library-tracker start           # frontend
```

Quality gates — all must pass before a PR is ready:

```bash
yarn tsc && yarn build   # type-check + build all packages
yarn lint                # ESLint across all packages
CI=true yarn test        # run all tests once (omit CI for watch mode)
```

## Coding principles (required)

Every change must satisfy these — reviewers will ask for them:

- **KISS** — the simplest solution that works.
- **DRY** — extract a shared helper instead of copy-pasting.
- **YAGNI** — build only what the current change needs.
- **Single Responsibility** — one job per function / module; no "god functions".
- **Early returns / guard clauses** — handle edge cases up front; avoid deep nesting.
- **Readable & maintainable** — clear names, small functions, obvious control flow.
- **Comment the _why_, not the _what_** — short and useful, never noise.

Parsers and pure logic must stay **side-effect free** (no I/O) so they're trivially testable —
the scanner does all fetching.

## Testing

- Add or update tests for every behavioural change. We use the Backstage CLI's Jest setup.
- Pure logic (parsers, semver, helpers) gets fast unit tests.
- The store is tested against real SQLite via `TestDatabases`; the router via `supertest`;
  frontend components via `renderInTestApp`.
- Keep tests deterministic — no real network calls (inject fakes for the reader/registry).

## Adding a new ecosystem

The scanner is ecosystem-agnostic. To add one (e.g. Go, Gradle, Composer):

1. Implement [`EcosystemParser`](packages/backend/src/ecosystems/types.ts) — `ownsManifest`,
   `ownsSource`, `parseManifest`, `extractImports`, `matchDependency`.
2. Register it in [`packages/backend/src/ecosystems/index.ts`](packages/backend/src/ecosystems/index.ts).
3. Add the ecosystem to the `Ecosystem` union in
   [`packages/common/src/types.ts`](packages/common/src/types.ts) and a registry fetcher in
   [`RegistryClient`](packages/backend/src/registry/RegistryClient.ts).
4. Add parser tests with manifest + source fixtures, and update the README support matrix.

Set usage confidence honestly: only flag a dependency `unused` when absence of an import is
strong evidence (see the [Accuracy & limitations](README.md#accuracy--limitations) note).

## Branching strategy

We follow **feature branching** — `main` is always releasable and never receives direct commits.

```
main          ← production-ready releases only, merged via PR from dev
└── dev       ← integration branch, merged via PR from feature branches
    └── feature/<short-description>   ← one branch per feature / fix
```

**Workflow for every change:**

1. Branch off `dev`:
   ```bash
   git checkout dev && git pull
   git checkout -b feature/my-thing
   ```
2. Make changes, commit locally with clear messages.
3. Open a PR **`feature/… → dev`**. All quality gates must be green.
4. After review and merge into `dev`, open a PR **`dev → main`** to ship.

**Rules:**
- `main` and `dev` are protected — no force-pushes, no direct commits.
- Branch names must start with `feature/`, `fix/`, `chore/`, or `docs/`.
- Delete the feature branch after it is merged.

## Commits & pull requests

- Write clear, imperative commit messages (e.g. `Add Gradle manifest parser`).
- Reference issues with `Closes #123` where relevant.
- Fill in the PR template checklist.
- If you hit a non-obvious trap, add a one-line entry to the **Gotchas** section of `CLAUDE.md`
  so the next person doesn't repeat it.

## Reporting bugs & requesting features

Use the issue forms (🐞 Bug report / 💡 Feature request). For usage questions, open a
discussion. For security issues, please report privately rather than opening a public issue.
