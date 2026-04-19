import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListCallsParams extends ListParams {
  status?: string
  agent_id?: string
  start_date?: string
  end_date?: string
  phone_number?: string
  direction?: string
  min_duration?: number
  max_duration?: number
  search?: string
}

/**
 * Access call records and intelligence.
 * Calls are read-only in the SDK — they are created by the voice pipeline.
 */
export class CallsResource extends WorkspaceScopedResource {
  /** List calls with optional filtering */
  async list(params?: ListCallsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListCallsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get full call detail including turns, escalation, safety, and recording info */
  async get(callId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/{call_id}', {
        params: { path: { workspace_id: this.workspaceId, call_id: callId } },
      }),
    )
  }

  /** Get AI intelligence for a call */
  async getIntelligence(callId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/{call_id}/intelligence', {
        params: { path: { workspace_id: this.workspaceId, call_id: callId } },
      }),
    )
  }

  /** Get active intelligence across all in-progress calls */
  async getActiveIntelligence() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/active/intelligence', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get performance benchmarks for a time period */
  async getBenchmarks(params?: { days?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/benchmarks', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Get deep call trace analysis */
  async getTraceAnalysis(callId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/{call_id}/trace-analysis', {
        params: { path: { workspace_id: this.workspaceId, call_id: callId } },
      }),
    )
  }
}
