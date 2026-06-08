import { AuthService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';

/** Supplies the components to scan, decoupling the scanner from catalog/auth wiring. */
export interface EntitySource {
  /** All `kind: Component` entities in the catalog. */
  listComponents(): Promise<Entity[]>;
  getEntity(entityRef: string): Promise<Entity | undefined>;
}

/** Catalog-backed EntitySource using the plugin's own service credentials. */
export class CatalogEntitySource implements EntitySource {
  constructor(
    private readonly catalog: CatalogService,
    private readonly auth: AuthService,
  ) {}

  async listComponents(): Promise<Entity[]> {
    const credentials = await this.auth.getOwnServiceCredentials();
    // Scan Component, System and Resource kinds — all may carry a source-location.
    const kinds = ['Component', 'System', 'Resource'];
    const results = await Promise.all(
      kinds.map(kind => this.catalog.getEntities({ filter: { kind } }, { credentials }).then(r => r.items)),
    );
    return results.flat();
  }

  async getEntity(entityRef: string): Promise<Entity | undefined> {
    const credentials = await this.auth.getOwnServiceCredentials();
    return this.catalog.getEntityByRef(entityRef, { credentials });
  }
}
