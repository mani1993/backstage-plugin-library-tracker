# Security Policy

## Supported versions

Only the latest release on `main` is actively maintained and receives security fixes.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately using GitHub's built-in
[Security Advisories](https://github.com/mani1993/backstage-plugin-library-tracker/security/advisories/new)
or email [jmrsreddy1993@gmail.com](mailto:jmrsreddy1993@gmail.com).

Please include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- A suggested fix if you have one (optional)

We aim to acknowledge reports within **48 hours** and resolve confirmed vulnerabilities within **90 days**.

## Security measures in this repository

| Measure | Status |
| ------- | ------ |
| Secret scanning | ✅ enabled — detects accidentally committed tokens |
| Push protection | ✅ enabled — blocks commits containing secrets |
| Dependabot alerts | ✅ enabled — flags vulnerable dependencies |
| Dependabot security PRs | ✅ enabled — auto-raises PRs for vulnerable deps |
| CodeQL analysis | ✅ runs on every PR and weekly schedule |
| CI checks required | ✅ PRs to `main`/`dev` must pass lint · type-check · tests |
| Branch protection | ✅ no direct pushes to `main` or `dev`; PRs required |
| CODEOWNERS | ✅ merges to `main` require owner approval |
