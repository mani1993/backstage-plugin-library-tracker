# backstage-plugin-library-tracker-common

> Shared types, API reference, and DTOs for [Library Tracker](https://github.com/mani1993/backstage-plugin-library-tracker).

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/npm/v/backstage-plugin-library-tracker-common)

This package is isomorphic (works in both browser and Node) and contains:

- TypeScript types: `DependencyRecord`, `ScanTarget`, `ScanStatus`, `Ecosystem`, and report DTOs
- `libraryTrackerApiRef` — the Backstage API reference used by the frontend to call the backend

## Install

You do **not** need to install this package directly. It is automatically installed as a dependency of both `backstage-plugin-library-tracker` (frontend) and `backstage-plugin-library-tracker-backend`.

Install it explicitly only if you need its types in your own code:

```bash
yarn add backstage-plugin-library-tracker-common
```

## Full documentation

See the [main repository README](https://github.com/mani1993/backstage-plugin-library-tracker) for full setup, configuration, and API reference.

## License

MIT
