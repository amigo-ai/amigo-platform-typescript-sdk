import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { PaginatedResponse } from '../types/api.js'

export interface AuditLogEntry {
  id: string
  workspace_id: string
  actor_key_id: string
  actor_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  status: 'success' | 'failure'
  ip_address: string | null
  user_agent: string | null
  request_id: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ListAuditLogParams {
  limit?: number
  continuation_token?: number
  action?: string
  resource_type?: string
  actor_key_id?: string
  start_date?: string
  end_date?: string
  status?: 'success' | 'failure'
}

/**
 * Audit log — immutable record of all API actions taken in the workspace.
 * Useful for compliance, security investigations, and change tracking.
 */
export class AuditResource extends WorkspaceScopedResource {
  /** List audit log entries with optional filtering */
  async list(params?: ListAuditLogParams): Promise<PaginatedResponse<AuditLogEntry>> {
    return this.fetch<PaginatedResponse<AuditLogEntry>>(`/audit${buildQuery(params)}`)
  }

  /** Get a single audit log entry */
  async get(entryId: string): Promise<AuditLogEntry> {
    return this.fetch<AuditLogEntry>(`/audit/${entryId}`)
  }
}
