import { WorkspaceScopedResource, buildQuery } from './base.js'

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** A metric value paired with its period-over-period change */
export interface MetricWithDelta {
  value: number | null
  delta_pct: number | null
}

export interface AnalyticsQueryParams {
  /** Shorthand period, e.g. "7d", "30d" */
  period?: string
  start_date?: string
  end_date?: string
  agent_id?: string
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface AnalyticsDashboard {
  call_volume: MetricWithDelta
  avg_quality: MetricWithDelta
  avg_ttfb_ms: MetricWithDelta
  escalation_rate: MetricWithDelta
  tool_success_rate: MetricWithDelta
  avg_duration_s: MetricWithDelta
  period_days: number
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export interface CallAnalytics {
  workspace_id: string
  period_start: string
  period_end: string
  total_calls: number
  total_duration_seconds: number
  avg_duration_seconds: number
  calls_by_date: Array<{ date: string; count: number }>
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export interface AgentAnalytics {
  agent_id: string
  agent_name: string
  total_calls: number
  completed_calls: number
  avg_duration_seconds: number
  completion_rate: number
}

export interface AgentAnalyticsResponse {
  agents: AgentAnalytics[]
  period: string
}

// ---------------------------------------------------------------------------
// Call quality
// ---------------------------------------------------------------------------

export interface CallQualityMetrics {
  avg_sentiment: number | null
  positive_pct: number
  negative_pct: number
  neutral_pct: number
  avg_transcription_confidence: number | null
  flagged_calls: number
}

// ---------------------------------------------------------------------------
// Emotion trends
// ---------------------------------------------------------------------------

export interface EmotionTrends {
  data: Array<{
    date: string
    emotions: Record<string, number>
  }>
}

// ---------------------------------------------------------------------------
// Latency
// ---------------------------------------------------------------------------

export interface LatencyMetrics {
  avg_ttfb_ms: number
  p50_ttfb_ms: number
  p95_ttfb_ms: number
  avg_response_ms: number
  p95_response_ms: number
}

// ---------------------------------------------------------------------------
// Tool performance
// ---------------------------------------------------------------------------

export interface ToolPerformance {
  tool_name: string
  call_count: number
  success_rate: number
  avg_latency_ms: number
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

export interface DataQualityMetrics {
  completeness_score: number
  duplicate_rate: number
  missing_canonical_id_pct: number
  stale_entities: number
}

// ---------------------------------------------------------------------------
// Advanced call stats
// ---------------------------------------------------------------------------

export interface AdvancedCallStats {
  abandonment_rate: number
  transfer_rate: number
  avg_silence_pct: number
  avg_interruptions: number
  by_hour_of_day: Array<{ hour: number; count: number }>
  by_day_of_week: Array<{ day: string; count: number }>
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export interface CallComparison {
  period_a: { start: string; end: string; calls: number; conversion_rate: number }
  period_b: { start: string; end: string; calls: number; conversion_rate: number }
  change_pct: Record<string, number>
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

/**
 * Analytics — aggregate metrics about calls, agents, quality, and usage.
 */
export class AnalyticsResource extends WorkspaceScopedResource {
  /** High-level dashboard summary — pass `days` (default: 7) for the lookback window */
  async getDashboard(params?: { days?: number }): Promise<AnalyticsDashboard> {
    return this.fetch<AnalyticsDashboard>(`/analytics/dashboard${buildQuery(params)}`)
  }

  /** Call volume and duration metrics */
  async getCalls(params?: AnalyticsQueryParams): Promise<CallAnalytics> {
    return this.fetch<CallAnalytics>(`/analytics/calls${buildQuery(params)}`)
  }

  /** Per-agent performance breakdown */
  async getAgents(params?: { period?: string }): Promise<AgentAnalyticsResponse> {
    return this.fetch<AgentAnalyticsResponse>(`/analytics/agents${buildQuery(params)}`)
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

  /** Advanced call statistics (abandonment, transfers, silence, hour-of-day) */
  async getAdvancedCallStats(params?: AnalyticsQueryParams): Promise<AdvancedCallStats> {
    return this.fetch<AdvancedCallStats>(`/analytics/calls/advanced${buildQuery(params)}`)
  }

  /** Compare two time periods side by side */
  async compareCallPeriods(params: {
    current_from: string
    current_to: string
    previous_from: string
    previous_to: string
    service_id?: string
  }): Promise<CallComparison> {
    return this.fetch<CallComparison>(`/analytics/calls/comparison${buildQuery(params)}`)
  }
}
