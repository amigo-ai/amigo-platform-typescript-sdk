import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface AnalyticsDashboard {
  total_calls: number
  total_duration_seconds: number
  answer_rate: number
  conversion_rate: number
  avg_sentiment_score: number | null
  period_start: string
  period_end: string
  sparklines: Record<string, number[]>
}

export interface CallAnalytics {
  calls: number
  duration_seconds: number
  inbound: number
  outbound: number
  answer_rate: number
  avg_duration_seconds: number
  by_day: Array<{ date: string; count: number; duration_seconds: number }>
}

export interface AgentAnalytics {
  agent_id: string
  agent_name: string
  calls: number
  avg_duration_seconds: number
  conversion_rate: number
  sentiment_score: number | null
}

export interface CallQualityMetrics {
  avg_sentiment: number | null
  positive_pct: number
  negative_pct: number
  neutral_pct: number
  avg_transcription_confidence: number | null
  flagged_calls: number
}

export interface EmotionTrends {
  data: Array<{
    date: string
    emotions: Record<string, number>
  }>
}

export interface LatencyMetrics {
  avg_ttfb_ms: number
  p50_ttfb_ms: number
  p95_ttfb_ms: number
  avg_response_ms: number
  p95_response_ms: number
}

export interface ToolPerformance {
  tool_name: string
  call_count: number
  success_rate: number
  avg_latency_ms: number
}

export interface DataQualityMetrics {
  completeness_score: number
  duplicate_rate: number
  missing_canonical_id_pct: number
  stale_entities: number
}

export interface AnalyticsQueryParams {
  start_date?: string
  end_date?: string
  agent_id?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
}

export interface AdvancedCallStats {
  abandonment_rate: number
  transfer_rate: number
  avg_silence_pct: number
  avg_interruptions: number
  by_hour_of_day: Array<{ hour: number; count: number }>
  by_day_of_week: Array<{ day: string; count: number }>
}

export interface CallComparison {
  period_a: { start: string; end: string; calls: number; conversion_rate: number }
  period_b: { start: string; end: string; calls: number; conversion_rate: number }
  change_pct: Record<string, number>
}

/**
 * Analytics — aggregate metrics about calls, agents, quality, and usage.
 * Endpoint paths match the developer console API client exactly.
 */
export class AnalyticsResource extends WorkspaceScopedResource {
  /** High-level dashboard summary with sparklines */
  async getDashboard(params?: AnalyticsQueryParams): Promise<AnalyticsDashboard> {
    return this.fetch<AnalyticsDashboard>(`/analytics/dashboard${buildQuery(params)}`)
  }

  /** Call volume and duration metrics */
  async getCalls(params?: AnalyticsQueryParams): Promise<CallAnalytics> {
    return this.fetch<CallAnalytics>(`/analytics/calls${buildQuery(params)}`)
  }

  /** Per-agent performance breakdown */
  async getAgents(params?: AnalyticsQueryParams): Promise<AgentAnalytics[]> {
    return this.fetch<AgentAnalytics[]>(`/analytics/agents${buildQuery(params)}`)
  }

  /** Call quality — sentiment, transcription confidence, flagged calls */
  async getCallQuality(params?: AnalyticsQueryParams): Promise<CallQualityMetrics> {
    return this.fetch<CallQualityMetrics>(`/analytics/call-quality${buildQuery(params)}`)
  }

  /** Emotion trend data over time */
  async getEmotionTrends(params?: AnalyticsQueryParams): Promise<EmotionTrends> {
    return this.fetch<EmotionTrends>(`/analytics/emotion-trends${buildQuery(params)}`)
  }

  /** Voice pipeline latency metrics (TTFB, response time) */
  async getLatency(params?: AnalyticsQueryParams): Promise<LatencyMetrics> {
    return this.fetch<LatencyMetrics>(`/analytics/latency${buildQuery(params)}`)
  }

  /** Tool call performance — success rates and latency per tool */
  async getToolPerformance(params?: AnalyticsQueryParams): Promise<ToolPerformance[]> {
    return this.fetch<ToolPerformance[]>(`/analytics/tool-performance${buildQuery(params)}`)
  }

  /** Data quality metrics for the workspace world model */
  async getDataQuality(params?: AnalyticsQueryParams): Promise<DataQualityMetrics> {
    return this.fetch<DataQualityMetrics>(`/analytics/data-quality${buildQuery(params)}`)
  }

  /** Usage summary — API requests, call minutes, storage */
  async getUsage(params?: AnalyticsQueryParams): Promise<Record<string, unknown>> {
    return this.fetch(`/analytics/usage${buildQuery(params)}`)
  }

  /** Operator performance as seen from the analytics layer */
  async getOperatorPerformance(params?: AnalyticsQueryParams): Promise<Record<string, unknown>> {
    return this.fetch(`/analytics/operator-performance${buildQuery(params)}`)
  }

  /** Advanced call statistics (abandonment, transfers, silence, hour-of-day) */
  async getAdvancedCallStats(params?: AnalyticsQueryParams): Promise<AdvancedCallStats> {
    return this.fetch<AdvancedCallStats>(`/analytics/calls/advanced${buildQuery(params)}`)
  }

  /** Compare two time periods side by side */
  async compareCallPeriods(params: {
    period_a_start: string
    period_a_end: string
    period_b_start: string
    period_b_end: string
  }): Promise<CallComparison> {
    return this.fetch<CallComparison>(`/analytics/calls/comparison${buildQuery(params)}`)
  }
}
