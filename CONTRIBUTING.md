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

`main` is always production-ready. All work goes through short-lived branches and pull requests.

```
main   ← releases only — merged via PR from dev (or hotfix for urgent patches)
└── dev  ← integration branch — merged via PR from work branches
    ├── feature/<description>   new functionality
    ├── fix/<issue>-<description>   bug fixes tied to an issue
    ├── issue/<issue>-<description>   general issue work
    ├── chore/<description>   maintenance, deps, config
    └── docs/<description>   documentation only

hotfix/<description>   ← branches off main, merges to BOTH main and dev
```

### Branch types

| Prefix | When to use | Base branch | PR target |
| ------ | ----------- | ----------- | --------- |
| `feature/` | New feature or enhancement | `dev` | `dev` |
| `fix/<issue>-` | Bug fix linked to a GitHub issue | `dev` | `dev` |
| `issue/<issue>-` | Any work tied to a GitHub issue | `dev` | `dev` |
| `chore/` | Deps, config, tooling, CI — no behaviour change | `dev` | `dev` |
| `docs/` | Documentation only | `dev` | `dev` |
| `hotfix/` | Urgent production patch — cannot wait for `dev` | `main` | `main` + `dev` |

### Standard workflow (feature / fix / issue / chore / docs)

```bash
git checkout dev && git pull
git checkout -b fix/42-wrong-semver-patch   # or feature/, issue/, chore/, docs/

# make changes and commit
git push origin fix/42-wrong-semver-patch
# open PR → dev
```

### Hotfix workflow

Use only for critical production bugs that cannot wait for the next `dev → main` release.

```bash
git checkout main && git pull
git checkout -b hotfix/registry-timeout

# make the minimal fix and commit
git push origin hotfix/registry-timeout
# open PR → main (gets your approval + CI)
# after merging to main, also open PR hotfix → dev to keep branches in sync
```

**Rules:**

| Rule | Detail |
| ---- | ------ |
| No direct commits | `main` and `dev` are protected — always use a PR |
| Branch naming | Must match one of the prefixes above — enforced by CI |
| Issue reference | `fix/` and `issue/` branches must include the issue number |
| Clean up | Delete the branch after it is merged |
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
