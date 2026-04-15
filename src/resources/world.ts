import type {
  Entity,
  WorldEvent,
  TimelineEntry,
  SimilarEntitiesResponse,
  CreateEntityRequest,
  UpdateEntityRequest,
  EmitEventRequest,
  MergeEntitiesRequest,
  PaginatedResponse,
  EntityType,
} from '../types/api.js'
import type { EntityId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListEntitiesParams extends ListParams {
  entity_type?: EntityType
  canonical_id?: string
  search?: string
  source_system?: string
  tags?: string
}

export interface TimelineParams {
  limit?: number
  event_type?: string
  start_date?: string
  end_date?: string
}

export interface EntityRelationship {
  id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: string
  confidence: number
  properties: Record<string, unknown>
  created_at: string
}

export interface EntityType_ {
  type: string
  count: number
  schema: Record<string, unknown> | null
}

export interface EntityGraph {
  nodes: Array<{ entity: Entity; depth: number }>
  edges: Array<EntityRelationship>
}

export interface EntityProvenance {
  entity_id: string
  sources: Array<{
    system: string
    external_id: string | null
    first_seen_at: string
    last_seen_at: string
    event_count: number
  }>
}

export interface EntityLineage {
  entity_id: string
  merged_into: string | null
  merged_from: string[]
  canonical_id: string | null
}

export interface SyncEvent {
  id: string
  entity_id: string
  sink: string
  status: 'pending' | 'synced' | 'failed' | 'retrying'
  error: string | null
  attempts: number
  created_at: string
  synced_at: string | null
}

export interface SyncStatusBySink {
  sink: string
  pending: number
  synced: number
  failed: number
  last_synced_at: string | null
}

export interface SourceBreakdown {
  source: string
  entity_count: number
  event_count: number
  last_seen_at: string | null
}

export interface EntityStats {
  total_entities: number
  total_events: number
  entity_types: Array<{ type: string; count: number }>
  sources: Array<{ source: string; count: number }>
}

export interface SearchEntitiesParams {
  q: string
  entity_type?: EntityType
  limit?: number
}

export interface ListSyncEventsParams extends ListParams {
  sink?: string
  status?: string
  start_date?: string
  end_date?: string
}

export interface DuplicatesParams extends ListParams {
  entity_type?: EntityType
  min_confidence?: number
}

/**
 * World Model — entities, events, relationships, and the entity timeline.
 *
 * The world model is the core knowledge graph of the platform. Entities
 * represent real-world objects (patients, contacts, calls). Events record
 * observations about entities over time.
 */
export class WorldResource extends WorkspaceScopedResource {
  // ---- Entities ----

  /** Create a new entity */
  async createEntity(body: CreateEntityRequest): Promise<Entity> {
    return this.fetch<Entity>('/world/entities', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List entities with optional filtering */
  async listEntities(params?: ListEntitiesParams): Promise<PaginatedResponse<Entity>> {
    return this.fetch<PaginatedResponse<Entity>>(`/world/entities${buildQuery(params)}`)
  }

  /** Get a single entity */
  async getEntity(entityId: EntityId | string): Promise<Entity> {
    return this.fetch<Entity>(`/world/entities/${entityId}`)
  }

  /** Update entity properties */
  async updateEntity(entityId: EntityId | string, body: UpdateEntityRequest): Promise<Entity> {
    return this.fetch<Entity>(`/world/entities/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Get all relationships for an entity */
  async getRelationships(entityId: EntityId | string): Promise<EntityRelationship[]> {
    return this.fetch<EntityRelationship[]>(`/world/entities/${entityId}/relationships`)
  }

  /** Get the knowledge graph centered on an entity (entity + neighbors + edges) */
  async getGraph(entityId: EntityId | string): Promise<EntityGraph> {
    return this.fetch<EntityGraph>(`/world/entities/${entityId}/graph`)
  }

  /** Get provenance — which source systems contributed data for an entity */
  async getProvenance(entityId: EntityId | string): Promise<EntityProvenance> {
    return this.fetch<EntityProvenance>(`/world/entities/${entityId}/provenance`)
  }

  /** Get lineage — merge history and canonical identity for an entity */
  async getLineage(entityId: EntityId | string): Promise<EntityLineage> {
    return this.fetch<EntityLineage>(`/world/entities/${entityId}/lineage`)
  }

  /** Get merged entities for a canonical entity */
  async getMerged(entityId: EntityId | string): Promise<Entity[]> {
    return this.fetch<Entity[]>(`/world/entities/${entityId}/merged`)
  }

  // ---- Entity Types ----

  /** List registered entity types with counts and schemas */
  async listEntityTypes(): Promise<EntityType_[]> {
    return this.fetch<EntityType_[]>('/world/entity-types')
  }

  // ---- Duplicate Detection ----

  /** List potential duplicate entity pairs for review or merging */
  async listDuplicates(params?: DuplicatesParams): Promise<PaginatedResponse<{ entity_a: Entity; entity_b: Entity; confidence: number }>> {
    return this.fetch(`/world/entities/duplicates${buildQuery(params)}`)
  }

  // ---- Semantic Search ----

  /** Semantic (vector) search over entities */
  async search(params: SearchEntitiesParams): Promise<Array<{ entity: Entity; score: number }>> {
    return this.fetch(`/world/search${buildQuery(params)}`)
  }

  // ---- Events ----

  /**
   * Emit an event for an entity.
   * Events flow to Delta via ZeroBus for downstream analytics.
   */
  async emitEvent(body: EmitEventRequest): Promise<WorldEvent> {
    return this.fetch<WorldEvent>('/world/events', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ---- Timeline ----

  /** Get the event timeline for an entity (reverse-chronological) */
  async getTimeline(
    entityId: EntityId | string,
    params?: TimelineParams,
  ): Promise<TimelineEntry[]> {
    return this.fetch<TimelineEntry[]>(`/world/timeline/${entityId}${buildQuery(params)}`)
  }

  // ---- Intelligence ----

  /** Get AI-derived intelligence for an entity */
  async getIntelligence(entityId: EntityId | string): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(`/world/intelligence/${entityId}`)
  }

  /** Find entities similar to a given entity using vector similarity */
  async getSimilar(entityId: EntityId | string, limit?: number): Promise<SimilarEntitiesResponse> {
    return this.fetch<SimilarEntitiesResponse>(`/world/similar/${entityId}${buildQuery({ limit })}`)
  }

  /** Merge multiple entities into one canonical entity */
  async merge(body: MergeEntitiesRequest): Promise<Entity> {
    return this.fetch<Entity>('/world/merge', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ---- Sync ----

  /** Get sync status grouped by sink (Lakebase, Delta, etc.) */
  async getSyncStatusBySink(): Promise<SyncStatusBySink[]> {
    return this.fetch<SyncStatusBySink[]>('/world/sync/by-sink')
  }

  /** List sync events with status filtering */
  async listSyncEvents(params?: ListSyncEventsParams): Promise<PaginatedResponse<SyncEvent>> {
    return this.fetch<PaginatedResponse<SyncEvent>>(`/world/sync/events${buildQuery(params)}`)
  }

  /** Get current sync queue depth */
  async getSyncQueueDepth(): Promise<{ depth: number; oldest_pending_at: string | null }> {
    return this.fetch('/world/sync/queue')
  }

  /** Retry a single failed sync event */
  async retrySyncEvent(eventId: string): Promise<SyncEvent> {
    return this.fetch<SyncEvent>(`/world/sync/retry/${eventId}`, { method: 'POST' })
  }

  /** Retry all failed sync events */
  async retryAllSyncEvents(): Promise<{ queued: number }> {
    return this.fetch('/world/sync/retry-all', { method: 'POST' })
  }

  // ---- Statistics ----

  /** Get aggregate entity and event statistics */
  async getStats(): Promise<EntityStats> {
    return this.fetch<EntityStats>('/world/entity-stats')
  }

  /** Get entity counts broken down by source system */
  async getSourceBreakdown(): Promise<SourceBreakdown[]> {
    return this.fetch<SourceBreakdown[]>('/world/source-breakdown')
  }
}
