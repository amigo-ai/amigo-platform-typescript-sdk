import type {
  Operator,
  CreateOperatorRequest,
  UpdateOperatorRequest,
  OperatorDashboard,
  PaginatedResponse,
} from '../types/api.js'
import type { OperatorId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface OperatorPerformance {
  operator_id: string
  operator_name: string
  calls_handled: number
  avg_handle_time_seconds: number
  avg_sentiment_score: number | null
  escalations: number
  wrap_ups: number
  period_start: string
  period_end: string
}

export interface Escalation {
  id: string
  call_sid: string
  operator_id: string | null
  reason: string
  status: 'pending' | 'active' | 'resolved'
  created_at: string
  resolved_at: string | null
}

export interface EscalationStats {
  total: number
  pending: number
  active: number
  resolved: number
  avg_resolution_seconds: number | null
}

export interface OperatorBriefing {
  operator_id: string
  call_sid: string
  summary: string
  key_context: string[]
  suggested_actions: string[]
}

export interface WrapUpRequest {
  call_sid: string
  disposition: string
  notes?: string
  action_items?: string[]
  follow_up_required?: boolean
}

export interface OperatorAuditEntry {
  id: string
  operator_id: string
  action: string
  call_sid: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Manage operators — human agents who monitor and join live calls.
 * Includes escalation management, live guidance, and performance analytics.
 */
export class OperatorsResource extends WorkspaceScopedResource {
  // ---- CRUD ----

  async create(body: CreateOperatorRequest): Promise<Operator> {
    return this.fetch<Operator>('/operators', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListParams): Promise<PaginatedResponse<Operator>> {
    return this.fetch<PaginatedResponse<Operator>>(`/operators${buildQuery(params)}`)
  }

  async get(operatorId: OperatorId | string): Promise<Operator> {
    return this.fetch<Operator>(`/operators/${operatorId}`)
  }

  async update(operatorId: OperatorId | string, body: UpdateOperatorRequest): Promise<Operator> {
    return this.fetch<Operator>(`/operators/${operatorId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete(operatorId: OperatorId | string): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}`, { method: 'DELETE' })
  }

  // ---- Dashboard ----

  /** Real-time dashboard metrics (queue depth, active calls, wait times) */
  async getDashboard(): Promise<OperatorDashboard> {
    return this.fetch<OperatorDashboard>('/operators/dashboard')
  }

  /** Get the current operator queue */
  async getQueue(): Promise<{ items: Array<{ call_sid: string; wait_seconds: number; reason: string }> }> {
    return this.fetch('/operators/queue')
  }

  // ---- Call Participation ----

  /** Join a live call as a listener or participant */
  async joinCall(operatorId: OperatorId | string, callSid: string): Promise<{ join_url: string }> {
    return this.fetch<{ join_url: string }>(`/operators/${operatorId}/join-call`, {
      method: 'POST',
      body: JSON.stringify({ call_sid: callSid }),
    })
  }

  /** Leave an active call */
  async leaveCall(operatorId: OperatorId | string, callSid: string): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}/leave-call`, {
      method: 'POST',
      body: JSON.stringify({ call_sid: callSid }),
    })
  }

  /** Switch operator mode (e.g. listen → barge → whisper) */
  async switchMode(operatorId: OperatorId | string, mode: 'listen' | 'barge' | 'whisper'): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}/switch-mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    })
  }

  /** Get a short-lived access token for the operator (e.g. for Twilio Client) */
  async getAccessToken(operatorId: OperatorId | string): Promise<{ token: string; expires_at: string }> {
    return this.fetch(`/operators/${operatorId}/access-token`, { method: 'POST' })
  }

  /** Get call transcript for the operator view */
  async getCallTranscript(callSid: string): Promise<Array<{ speaker: string; text: string; timestamp: string }>> {
    return this.fetch(`/operators/calls/${callSid}/transcript`)
  }

  /** Send a whisper message or guidance to a live call */
  async sendGuidance(operatorId: OperatorId | string, callSid: string, message: string): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}/send-guidance`, {
      method: 'POST',
      body: JSON.stringify({ call_sid: callSid, message }),
    })
  }

  // ---- Briefing & Wrap-up ----

  /** Generate an AI briefing for an operator before or during a call */
  async getBriefing(operatorId: OperatorId | string, callSid: string): Promise<OperatorBriefing> {
    return this.fetch<OperatorBriefing>(`/operators/${operatorId}/briefing`, {
      method: 'POST',
      body: JSON.stringify({ call_sid: callSid }),
    })
  }

  /** Submit a wrap-up / disposition after a call ends */
  async wrapUp(operatorId: OperatorId | string, body: WrapUpRequest): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}/wrap-up`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ---- Escalations ----

  /** List active escalations */
  async listActiveEscalations(): Promise<Escalation[]> {
    return this.fetch<Escalation[]>('/operators/escalations/active')
  }

  /** Get escalation statistics */
  async getEscalationStats(params?: { start_date?: string; end_date?: string }): Promise<EscalationStats> {
    return this.fetch<EscalationStats>(`/operators/escalations/stats${buildQuery(params)}`)
  }

  // ---- Performance ----

  /** Get per-operator performance metrics */
  async getPerformance(params?: { start_date?: string; end_date?: string }): Promise<OperatorPerformance[]> {
    return this.fetch<OperatorPerformance[]>(`/operators/performance${buildQuery(params)}`)
  }

  // ---- Audit ----

  /** Get the operator-specific audit log */
  async getAuditLog(params?: ListParams): Promise<PaginatedResponse<OperatorAuditEntry>> {
    return this.fetch<PaginatedResponse<OperatorAuditEntry>>(`/operators/audit-log${buildQuery(params)}`)
  }
}
