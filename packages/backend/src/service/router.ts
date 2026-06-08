import express, { Request } from 'express';
import Router from 'express-promise-router';
import { LoggerService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import { DependencyQuery, DriftSeverity, Ecosystem } from 'backstage-plugin-library-tracker-common';
import { Scanner } from '../scan';
import { LibraryTrackerStore } from '../store';

export interface RouterOptions {
  logger: LoggerService;
  store: LibraryTrackerStore;
  scanner: Scanner;
}

const ECOSYSTEMS: Ecosystem[] = ['npm', 'maven', 'python', 'nuget'];
const SEVERITIES: DriftSeverity[] = ['major', 'minor', 'patch', 'up-to-date', 'unknown'];

/** Read a required `name` query param, rejecting empty values. */
function requireName(req: Request): string {
  const name = req.query.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw new InputError('Query parameter "name" is required');
  }
  return name;
}

/** Translate raw query params into a validated DependencyQuery. */
function parseDependencyQuery(req: Request): DependencyQuery {
  const { ecosystem, severity, owner, entityRef, unused, outdated, offset, limit } = req.query;

  if (ecosystem && !ECOSYSTEMS.includes(ecosystem as Ecosystem)) {
    throw new InputError(`Unknown ecosystem: ${ecosystem}`);
  }
  if (severity && !SEVERITIES.includes(severity as DriftSeverity)) {
    throw new InputError(`Unknown severity: ${severity}`);
  }

  return {
    entityRef: typeof entityRef === 'string' ? entityRef : undefined,
    ecosystem: ecosystem as Ecosystem | undefined,
    owner: typeof owner === 'string' ? owner : undefined,
    severity: severity as DriftSeverity | undefined,
    unused: unused === 'true',
    outdated: outdated === 'true',
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  };
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { store, scanner } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/dependencies', async (req, res) => {
    res.json(await store.listDependencies(parseDependencyQuery(req)));
  });

  router.get('/entities/:namespace/:kind/:name/dependencies', async (req, res) => {
    const { namespace, kind, name } = req.params;
    const entityRef = `${kind}:${namespace}/${name}`.toLowerCase();
    res.json(await store.listEntityDependencies(entityRef));
  });

  // Reverse search and occurrences take the library name as a query param so that
  // scoped npm names (`@scope/pkg`) and maven coordinates (`group:artifact`) survive.
  router.get('/libraries/lookup', async (req, res) => {
    const library = await store.getLibrary(requireName(req));
    if (!library) {
      res.status(404).json({ error: 'library not found' });
      return;
    }
    res.json(library);
  });

  router.get('/libraries/occurrences', async (req, res) => {
    const entityRef = typeof req.query.entityRef === 'string' ? req.query.entityRef : undefined;
    res.json(await store.getOccurrences(requireName(req), entityRef));
  });

  router.get('/reports/overview', async (_req, res) => {
    res.json(await store.getOverviewStats());
  });

  router.get('/reports/duplicates', async (_req, res) => {
    res.json(await store.duplicateVersions());
  });

  router.get('/reports/unused', async (_req, res) => {
    res.json(await store.listUnused());
  });

  router.get('/reports/outdated', async (req, res) => {
    const severity = req.query.severity;
    if (severity && !SEVERITIES.includes(severity as DriftSeverity)) {
      throw new InputError(`Unknown severity: ${severity}`);
    }
    res.json(await store.listOutdated(severity as DriftSeverity | undefined));
  });

  router.get('/scan/status', async (_req, res) => {
    res.json({ items: await store.listStatuses() });
  });

  router.get('/scan/runs', async (_req, res) => {
    res.json({ items: await store.listRuns(50) });
  });

  router.post('/scan/refresh', async (req, res) => {
    const entityRef = req.body?.entityRef;
    const run = entityRef ? await scanner.scanOne(entityRef) : await scanner.scanAll('manual');
    res.json({ run, targets: run.scanned + run.skipped + run.failed });
  });

  return router;
}
