import type {
  Call,
  CallDetail,
  CallVolumeResponse,
  ListCallsParams,
  PaginatedResponse,
} from '../types/api.js'
import type { CallId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface CallBenchmarksResponse {
  avg_duration_seconds: number
  p50_duration_seconds: number
  p95_duration_seconds: number
  answer_rate: number
  period_start: string
  period_end: string
}

/**
 * Access call records and intelligence.
 * Calls are read-only in the SDK — they are created by the voice pipeline.
 */
export class CallsResource extends WorkspaceScopedResource {
  /** List calls with optional filtering */
  async list(params?: ListCallsParams): Promise<PaginatedResponse<Call>> {
    return this.fetch<PaginatedResponse<Call>>(`/calls${buildQuery(params as Record<string, unknown>)}`)
  }

  /** Get full call detail including transcript and intelligence */
  async get(callId: CallId | string): Promise<CallDetail> {
    return this.fetch<CallDetail>(`/calls/${callId}`)
  }

  /** Get AI intelligence for a call (summary, key moments, outcomes) */
  async getIntelligence(callId: CallId | string): Promise<CallDetail['intelligence']> {
    return this.fetch<CallDetail['intelligence']>(`/calls/${callId}/intelligence`)
  }

  /** Get call volume time series data */
  async getVolume(params?: { start_date?: string; end_date?: string; granularity?: string }): Promise<CallVolumeResponse> {
    return this.fetch<CallVolumeResponse>(`/calls/volume${buildQuery(params)}`)
  }

  /** Get active intelligence across all in-progress calls */
  async getActiveIntelligence(): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>('/calls/active-intelligence')
  }

  /** Get performance benchmarks for a time period */
  async getBenchmarks(params?: { start_date?: string; end_date?: string }): Promise<CallBenchmarksResponse> {
    return this.fetch<CallBenchmarksResponse>(`/calls/benchmarks${buildQuery(params)}`)
  }
}
