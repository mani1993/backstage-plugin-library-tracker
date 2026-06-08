# backstage-plugin-library-tracker

> Frontend plugin for [Library Tracker](https://github.com/mani1993/backstage-plugin-library-tracker) — org-wide third-party dependency visibility for Backstage.

![Backstage](https://img.shields.io/badge/Backstage-plugin-9BF0E1?logo=backstage&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/npm/v/backstage-plugin-library-tracker)

## Install

```bash
yarn --cwd packages/app add backstage-plugin-library-tracker
```

## Usage

**Org-wide page** — `packages/app/src/App.tsx`:

```tsx
import { LibraryTrackerPage } from 'backstage-plugin-library-tracker';

<Route path="/library-tracker" element={<LibraryTrackerPage />} />;
```

**Entity tab** — `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import {
  EntityLibraryTrackerContent,
  SystemLibraryTrackerContent,
  LibraryTrackerIcon,
} from 'backstage-plugin-library-tracker';

// Component entity page
<EntityLayout.Route path="/dependencies" title="Dependencies">
  <EntityLibraryTrackerContent />
</EntityLayout.Route>

// System entity page
<EntityLayout.Route path="/dependencies" title="Dependencies">
  <SystemLibraryTrackerContent />
</EntityLayout.Route>
```

**Sidebar icon** — `packages/app/src/components/Root/Root.tsx`:

```tsx
import { LibraryTrackerIcon } from 'backstage-plugin-library-tracker';

<SidebarItem icon={LibraryTrackerIcon} to="library-tracker" text="Library Tracker" />
```

## What it provides

- **Overview dashboard** — stat cards, drift breakdown, ecosystem distribution
- **All dependencies** — org-wide filterable table
- **Package search** — reverse lookup: which components use a library and at which versions
- **Outdated / Unused / Duplicate versions** — focused reports
- **Entity tab** — one component's dependencies with on-demand rescan
- **System tab** — aggregated dependencies for all components owned by a team
- **Code-occurrence viewer** — exact files and lines where a library is imported, with VCS links

## Full documentation

See the [main repository README](https://github.com/mani1993/backstage-plugin-library-tracker) for full setup, configuration, screenshots, and API reference.

## License

MIT
