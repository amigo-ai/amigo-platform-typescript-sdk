import type {
  Call,
  ListCallsParams,
  PaginatedResponse,
} from '../types/api.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface CallIntelligence {
  summary: string | null
  sentiment: string | null
  key_moments: Array<{ type: string; description: string; timestamp_s: number }>
  action_items: string[]
  outcomes: string[]
}

export interface CallTranscriptSegment {
  speaker: 'agent' | 'customer'
  text: string
  start_seconds: number
  end_seconds: number
}

export interface CallDetail extends Call {
  intelligence: CallIntelligence | null
  transcript: CallTranscriptSegment[]
}

export interface CallBenchmarks {
  workspace_id: string
  period_start: string
  period_end: string
  avg_duration_seconds: number
  answer_rate: number | null
  completion_rate: number | null
}

/**
 * Access call records and intelligence.
 * Calls are read-only in the SDK — they are created by the voice pipeline.
 */
export class CallsResource extends WorkspaceScopedResource {
  /** List calls with optional filtering */
  async list(params?: ListCallsParams): Promise<PaginatedResponse<Call>> {
    return this.fetch<PaginatedResponse<Call>>(`/calls/${buildQuery(params)}`)
  }

  /** Get full call detail including transcript and intelligence */
  async get(callSid: string): Promise<CallDetail> {
    return this.fetch<CallDetail>(`/calls/${callSid}`)
  }

  /** Get AI intelligence for a call */
  async getIntelligence(callSid: string): Promise<CallIntelligence> {
    return this.fetch<CallIntelligence>(`/calls/${callSid}/intelligence`)
  }

  /** Get active intelligence across all in-progress calls */
  async getActiveIntelligence(): Promise<Record<string, unknown>[]> {
    return this.fetch<Record<string, unknown>[]>('/calls/active/intelligence')
  }

  /** Get performance benchmarks for a time period */
  async getBenchmarks(params?: { days?: number }): Promise<CallBenchmarks> {
    return this.fetch<CallBenchmarks>(`/calls/benchmarks${buildQuery(params)}`)
  }
}
