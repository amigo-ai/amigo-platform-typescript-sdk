import type { components } from '../generated/api.js'
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
  include_simulated?: boolean
  service_id?: string
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

  /** Get the canonical playback timeline for a call */
  async getTimeline(callId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/{call_id}/timeline', {
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

  /** Get phone number call volume breakdown */
  async getPhoneVolume(params?: { days?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/phone-volume', {
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

  /** List trace analyses across calls (workspace-scoped feed) */
  async listTraces(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/traces', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Get latest Universal Metric Store values scoped to a single call */
  async getMetrics(callId: string, params?: { limit?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/calls/{call_id}/metrics', {
        params: {
          path: { workspace_id: this.workspaceId, call_id: callId },
          query: params,
        },
      }),
    )
  }

  /** Place an outbound call from the workspace's voice pipeline */
  async createOutbound(body: components['schemas']['CreateOutboundCallRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/calls/outbound', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }
}
