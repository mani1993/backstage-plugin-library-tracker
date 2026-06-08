# Contributing to Library Tracker

> Thanks for helping improve **backstage-plugin-library-tracker**!  
> Please read this guide before opening a PR — it covers setup, standards, and workflow.

![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Contents

- [Ground rules](#ground-rules)
- [Branching strategy](#branching-strategy)
- [Development setup](#development-setup)
- [Coding principles](#coding-principles)
- [Testing](#testing)
- [Adding a new ecosystem](#adding-a-new-ecosystem)
- [Commits & pull requests](#commits--pull-requests)
- [Reporting bugs & requesting features](#reporting-bugs--requesting-features)

---

## Ground rules

- **Be respectful and constructive.** Assume good intent.
- **One concern per PR.** Small, focused changes get reviewed and merged faster.
- **Discuss large changes first.** Open an issue before a big refactor or a new ecosystem so we can agree on the approach.
- **Never commit secrets.** Tokens and `*.local.yaml` files stay out of git (see `.gitignore`).

---

## Branching strategy

We follow **feature branching** — `main` is always releasable and never receives direct commits.

```
main          ← production-ready releases only, merged via PR from dev
└── dev       ← integration branch, merged via PR from feature branches
    └── feature/<short-description>   ← one branch per feature / fix
```

**Workflow for every change:**

```bash
# 1. Start from an up-to-date dev
git checkout dev && git pull

# 2. Create a feature branch
git checkout -b feature/my-thing

# 3. Make changes, commit locally
# 4. Push and open a PR → dev
```

Once the PR is reviewed and merged into `dev`, a separate PR ships `dev → main` to release.

**Rules:**

| Rule | Detail |
| ---- | ------ |
| No direct commits | `main` and `dev` are protected branches |
| Branch naming | Must start with `feature/`, `fix/`, `chore/`, or `docs/` |
| Clean up | Delete the feature branch after it is merged |
| Force-push | Never on `main` or `dev` |

---

## Development setup

Requires **Node 20 or 22** and **Yarn 1**.

```bash
yarn install
yarn tsc          # emit declaration files into dist-types/
```

Run the standalone dev harnesses — **no host app required**:

```bash
# in separate terminals:
yarn workspace backstage-plugin-library-tracker-backend start   # backend on :7007
yarn workspace backstage-plugin-library-tracker start           # frontend
```

**Quality gates** — all must be green before a PR is ready:

```bash
yarn tsc && yarn build   # type-check + build all packages
yarn lint                # ESLint across all packages
CI=true yarn test        # run all tests once (omit CI= for watch mode)
```

---

## Coding principles

Every change must satisfy these — reviewers will ask for them:

| Principle | What it means |
| --------- | ------------- |
| **KISS** | Simplest solution that works — no cleverness for its own sake |
| **DRY** | Extract a shared helper instead of copy-pasting logic |
| **YAGNI** | Build only what the current change needs |
| **Single Responsibility** | One job per function / module; no god functions |
| **Early returns** | Handle edge cases up front; avoid deep nesting |
| **Readable** | Clear names, small functions, obvious control flow |
| **Comment the *why*** | Short and useful — never describe what the code already says |

Parsers and pure logic must remain **side-effect free** (no I/O) so they are trivially testable — the scanner handles all fetching.

---

## Testing

- Add or update tests for **every behavioural change**.
- Pure logic (parsers, semver, helpers) → fast **unit tests**.
- Store layer → tested against **real SQLite** via `TestDatabases`.
- Router → tested via **supertest**.
- Frontend components → tested via **`renderInTestApp`**.
- Keep tests **deterministic** — no real network calls; inject fakes for the reader and registry.

```bash
CI=true yarn test --testPathPattern packages/backend   # backend only
CI=true yarn test --testPathPattern packages/frontend  # frontend only
```

---

## Adding a new ecosystem

The scanner is ecosystem-agnostic behind the [`EcosystemParser`](packages/backend/src/ecosystems/types.ts) interface. To add one (e.g. Go, Gradle, Composer):

1. **Implement the interface** — `ownsManifest`, `ownsSource`, `parseManifest`, `extractImports`, `matchDependency` in a new file under `packages/backend/src/ecosystems/`.
2. **Register it** in [`packages/backend/src/ecosystems/index.ts`](packages/backend/src/ecosystems/index.ts).
3. **Extend the type union** — add the ecosystem to `Ecosystem` in [`packages/common/src/types.ts`](packages/common/src/types.ts).
4. **Add a registry fetcher** in [`RegistryClient`](packages/backend/src/registry/RegistryClient.ts).
5. **Write parser tests** with manifest and source fixtures.
6. **Update the README** support matrix.

> Set usage confidence honestly — only flag a dependency `unused` when the absence of an import is strong evidence. See [Accuracy & limitations](README.md#accuracy--limitations).

---

## Commits & pull requests

- Write **clear, imperative** commit messages — e.g. `Add Gradle manifest parser`, `Fix semver patch detection for pre-release tags`.
- Reference issues with `Closes #123` where relevant.
- Fill in the **PR template checklist** before requesting review.
- If you hit a non-obvious trap, add a one-line entry to the **Gotchas** section of `CLAUDE.md` so the next person doesn't repeat it.

---

## Reporting bugs & requesting features

Use the issue forms:

- 🐞 **Bug report** — unexpected behaviour with a reproduction case
- 💡 **Feature request** — new capability or ecosystem support

For **usage questions**, open a discussion. For **security issues**, please report privately rather than opening a public issue.
