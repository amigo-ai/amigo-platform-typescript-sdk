import type { EntityId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Briefs — short, AI-generated context summaries about an entity. The GET
 * variant returns a cached brief; POST regenerates it on demand.
 *
 * @beta New in this release; surface may evolve.
 */
export class BriefsResource extends WorkspaceScopedResource {
  /** Get the workspace-level brief */
  async get() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/brief', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Regenerate the workspace-level brief */
  async regenerate() {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/brief', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get the brief for a specific entity */
  async getForEntity(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/entities/{entity_id}/brief', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Regenerate the brief for a specific entity */
  async regenerateForEntity(entityId: EntityId | string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/entities/{entity_id}/brief', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }
}
