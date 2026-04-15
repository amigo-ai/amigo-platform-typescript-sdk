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
}

export interface ListEventsParams extends ListParams {
  entity_id?: string
  event_type?: string
  source?: string
  start_date?: string
  end_date?: string
}

export interface TimelineParams {
  limit?: number
  event_type?: string
  start_date?: string
  end_date?: string
}

/**
 * World Model — entities, events, and the entity timeline.
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

  /** List entities */
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

  /**
   * Get the event timeline for an entity.
   * Returns events in reverse-chronological order.
   */
  async getTimeline(
    entityId: EntityId | string,
    params?: TimelineParams,
  ): Promise<TimelineEntry[]> {
    return this.fetch<TimelineEntry[]>(`/world/timeline/${entityId}${buildQuery(params)}`)
  }

  // ---- Intelligence ----

  /** Get AI-derived intelligence for an entity (summaries, insights) */
  async getIntelligence(entityId: EntityId | string): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(`/world/intelligence/${entityId}`)
  }

  /**
   * Find entities similar to a given entity using vector similarity search.
   */
  async getSimilar(entityId: EntityId | string, limit?: number): Promise<SimilarEntitiesResponse> {
    return this.fetch<SimilarEntitiesResponse>(
      `/world/similar/${entityId}${buildQuery({ limit })}`,
    )
  }

  /**
   * Merge multiple entities into one canonical entity.
   * The primary entity absorbs the secondary entities' events and properties.
   */
  async merge(body: MergeEntitiesRequest): Promise<Entity> {
    return this.fetch<Entity>('/world/merge', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}
