import type { EntityId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface DimensionScore {
  dimension: string
  name: string
  description: string | null
  weight: number
  fact_count: number
  avg_confidence: number
  source_count: number
  latest_fact_at: string | null
}

export interface EntityDimensionsResponse {
  entity_id: string
  dimensions: DimensionScore[]
  total_facts: number
}

export interface MemoryFact {
  dimension: string
  event_type: string
  source: string | null
  confidence: number
  extracted_text: string | null
  data: Record<string, unknown> | null
  ingested_at: string | null
}

export interface EntityFactsResponse {
  entity_id: string
  dimension: string | null
  facts: MemoryFact[]
  total: number
}

export interface DimensionAnalytics {
  dimension: string
  name: string
  description: string | null
  weight: number
  extraction_mode: string
  active: boolean
  builtin: boolean
  entity_count: number
  total_facts: number
  avg_facts_per_entity: number
  avg_confidence: number
  source_breakdown: Record<string, number>
  latest_fact_at: string | null
  sample_facts: Array<{ extracted_text: string; confidence: number; source: string | null; entity_id: string }>
}

export interface MemoryAnalyticsResponse {
  total_entities_with_memory: number
  total_entities_in_workspace: number
  coverage_rate: number
  total_facts: number
  dimensions: DimensionAnalytics[]
  top_sources: Array<{ source: string; fact_count: number; entity_count: number }>
  facts_last_24h: number
  facts_last_7d: number
  facts_last_30d: number
  active_dimensions: number
  builtin_dimensions: number
  custom_dimensions: number
  llm_dimensions: number
}

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
  async getEntityDimensions(entityId: EntityId | string): Promise<EntityDimensionsResponse> {
    return this.fetch<EntityDimensionsResponse>(`/memory/${entityId}/dimensions`)
  }

  /**
   * Get individual memory facts for an entity, optionally filtered by dimension.
   */
  async getEntityFacts(
    entityId: EntityId | string,
    params?: { dimension?: string; limit?: number },
  ): Promise<EntityFactsResponse> {
    return this.fetch<EntityFactsResponse>(`/memory/${entityId}/facts${buildQuery(params)}`)
  }

  /**
   * Get workspace-level memory analytics — coverage rates, dimension health,
   * and fact ingestion trends.
   */
  async getAnalytics(): Promise<MemoryAnalyticsResponse> {
    return this.fetch<MemoryAnalyticsResponse>('/memory/analytics')
  }
}
