import type {
  AnalyticsSummary,
  DailyAnalyticsEntry,
  AgentPerformance,
  AnalyticsQueryParams,
} from '../types/api.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

/**
 * Analytics — aggregate metrics about calls, conversions, and agent performance.
 */
export class AnalyticsResource extends WorkspaceScopedResource {
  /** Get aggregate summary metrics for a time period */
  async getSummary(params?: AnalyticsQueryParams): Promise<AnalyticsSummary> {
    return this.fetch<AnalyticsSummary>(`/analytics/summary${buildQuery(params)}`)
  }

  /** Get daily breakdown of call metrics */
  async getDaily(params?: AnalyticsQueryParams): Promise<DailyAnalyticsEntry[]> {
    return this.fetch<DailyAnalyticsEntry[]>(`/analytics/daily${buildQuery(params)}`)
  }

  /** Get call quality metrics (sentiment, transcription confidence, etc.) */
  async getCallQuality(params?: AnalyticsQueryParams): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(`/analytics/call-quality${buildQuery(params)}`)
  }

  /** Get conversion funnel analytics */
  async getConversion(params?: AnalyticsQueryParams): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(`/analytics/conversion${buildQuery(params)}`)
  }

  /** Get per-agent performance metrics */
  async getAgentPerformance(params?: AnalyticsQueryParams): Promise<AgentPerformance[]> {
    return this.fetch<AgentPerformance[]>(`/analytics/agent-performance${buildQuery(params)}`)
  }
}
