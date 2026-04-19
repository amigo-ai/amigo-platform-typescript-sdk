import type { EntityId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * World Model — entities, events, relationships, and the entity timeline.
 *
 * The world model is the core knowledge graph of the platform. Entities
 * represent real-world objects (patients, contacts, calls). Events record
 * observations about entities over time.
 */
export class WorldResource extends WorkspaceScopedResource {
  // ---- Entities ----

  /** List entities with optional filtering */
  async listEntities(params?: {
    entity_type?: string[] | null
    q?: string | null
    limit?: number
    offset?: number
    has_projection?: boolean | null
    source?: string | null
    source_system?: string | null
    semantic?: string | null
    tags?: string[] | null
  }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listEntitiesAutoPaging(params?: {
    entity_type?: string[] | null
    q?: string | null
    limit?: number
    offset?: number
    has_projection?: boolean | null
    source?: string | null
    source_system?: string | null
    semantic?: string | null
    tags?: string[] | null
  }) {
    return this.iterateOffsetPaginatedList(
      (pageParams) => this.listEntities(pageParams),
      (page) => page.entities,
      params,
    )
  }

  /** Get a single entity */
  async getEntity(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Get all relationships for an entity */
  async getRelationships(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/relationships', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Get the knowledge graph centered on an entity (entity + neighbors + edges) */
  async getGraph(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/graph', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Get provenance — which source systems contributed data for an entity */
  async getProvenance(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/provenance', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Get lineage — merge history and canonical identity for an entity */
  async getLineage(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/lineage', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  /** Get merged entities for a canonical entity */
  async getMerged(entityId: EntityId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/merged', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId } },
      }),
    )
  }

  // ---- Entity Types ----

  /** List registered entity types with counts and schemas */
  async listEntityTypes() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entity-types', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  // ---- Duplicate Detection ----

  /** List potential duplicate entity pairs for review or merging */
  async listDuplicates(params?: {
    entity_type?: string | null
    confidence_max?: number
  }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/duplicates', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  // ---- Semantic Search ----

  /** Semantic (vector) search over entities */
  async search(params: {
    q: string
    entity_type?: string | null
    source?: string | null
    confidence_min?: number | null
    limit?: number
    offset?: number
  }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/search', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  // ---- Timeline ----

  /** Get the event timeline for an entity (reverse-chronological) */
  async getTimeline(
    entityId: EntityId | string,
    params?: {
      domain?: string | null
      limit?: number
      offset?: number
    },
  ) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entities/{entity_id}/timeline', {
        params: {
          path: { workspace_id: this.workspaceId, entity_id: entityId },
          query: params,
        },
      }),
    )
  }

  getTimelineAutoPaging(
    entityId: EntityId | string,
    params?: {
      domain?: string | null
      limit?: number
      offset?: number
    },
  ) {
    return this.iterateOffsetPaginatedList(
      (pageParams) => this.getTimeline(entityId, pageParams),
      (page) => page.events,
      params,
    )
  }

  // ---- Sync ----

  /** Get sync status grouped by sink (Lakebase, Delta, etc.) */
  async getSyncStatusBySink() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/sync/by-sink', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** List sync events with status filtering */
  async listSyncEvents(params: {
    status: 'pending' | 'failed'
    data_source_id?: string | null
    source_system?: string | null
    fhir_resource_type?: string | null
    fhir_resource_id?: string | null
    limit?: number
    offset?: number
  }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/sync/events', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listSyncEventsAutoPaging(params: {
    status: 'pending' | 'failed'
    data_source_id?: string | null
    source_system?: string | null
    fhir_resource_type?: string | null
    fhir_resource_id?: string | null
    limit?: number
    offset?: number
  }) {
    return this.iterateOffsetPaginatedList(
      (pageParams) => this.listSyncEvents(pageParams),
      (page) => page.events,
      params,
    )
  }

  /** Get current sync queue depth */
  async getSyncQueueDepth() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/sync/queue', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Retry a single failed sync event */
  async retrySyncEvent(eventId: string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/world/sync/retry/{event_id}', {
        params: { path: { workspace_id: this.workspaceId, event_id: eventId } },
      }),
    )
  }

  /** Retry all failed sync events */
  async retryAllSyncEvents() {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/world/sync/retry-all', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  // ---- Statistics ----

  /** Get aggregate entity and event statistics */
  async getStats() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/entity-stats', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get entity counts broken down by source system */
  async getSourceBreakdown() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/world/source-breakdown', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
