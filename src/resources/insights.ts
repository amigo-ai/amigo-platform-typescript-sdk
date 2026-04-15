import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface InsightsSummary {
  period_start: string
  period_end: string
  highlights: string[]
  anomalies: string[]
  top_topics: Array<{ topic: string; count: number; trend: 'up' | 'down' | 'stable' }>
}

export interface InsightsTrendsResponse {
  trends: Array<{
    metric: string
    direction: 'up' | 'down' | 'stable'
    change_pct: number
    period_start: string
    period_end: string
  }>
}

export interface ResearchRequest {
  query: string
  entity_types?: string[]
  date_range?: { start: string; end: string }
  limit?: number
}

export interface ResearchResponse {
  results: Array<{
    entity_id: string
    entity_type: string
    relevance_score: number
    summary: string
    supporting_events: string[]
  }>
  total: number
}

export interface InsightsQueryParams {
  start_date?: string
  end_date?: string
}

/**
 * AI-generated insights — summaries, trend analysis, and semantic research
 * over your workspace's world model data.
 */
export class InsightsResource extends WorkspaceScopedResource {
  /** Get an AI-generated summary of activity for a time period */
  async getSummary(params?: InsightsQueryParams): Promise<InsightsSummary> {
    return this.fetch<InsightsSummary>(`/insights/summary${buildQuery(params)}`)
  }

  /**
   * Run a natural-language research query over your entity data.
   * Returns ranked results with supporting evidence.
   */
  async research(body: ResearchRequest): Promise<ResearchResponse> {
    return this.fetch<ResearchResponse>('/insights/research', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** Get metric trend data for a time period */
  async getTrends(params?: InsightsQueryParams): Promise<InsightsTrendsResponse> {
    return this.fetch<InsightsTrendsResponse>(`/insights/trends${buildQuery(params)}`)
  }
}
