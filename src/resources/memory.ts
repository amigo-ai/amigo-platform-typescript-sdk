import type { EntityId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Agent Memory — structured long-term memory for entities.
 *
 * Memory is organised into dimensions (e.g. "preferences", "health_history").
 * Each dimension accumulates facts extracted from calls and events over time.
 * This powers the "Agent Memory" view in the console.
 */
export class MemoryResource extends WorkspaceScopedResource {
  /**
   * Get all memory dimension scores for an entity.
   * Scores reflect how complete and confident each dimension's facts are.
   */
  async getEntityDimensions(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/memory/{entity_id}/dimensions', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /**
   * Get individual memory facts for an entity, optionally filtered by dimension.
   */
  async getEntityFacts(
    entityId: EntityId | string,
    params?: { dimension?: string; limit?: number },
  ) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/memory/{entity_id}/facts', {
        params: {
          path: { workspace_id: this.workspaceId, entity_id: entityId },
          query: params,
        },
      }),
    )
  }

  /**
   * Get workspace-level memory analytics — coverage rates, dimension health,
   * and fact ingestion trends.
   */
  async getAnalytics() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/memory/analytics', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
