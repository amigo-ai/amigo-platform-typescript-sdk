import type { PaginatedResponse } from '../types/api.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface Recording {
  id: string
  workspace_id: string
  call_id: string
  call_sid: string
  duration_seconds: number
  size_bytes: number
  url: string
  expires_at: string | null
  created_at: string
}

export interface ListRecordingsParams {
  limit?: number
  continuation_token?: number
  call_id?: string
  start_date?: string
  end_date?: string
}

/**
 * Access call recordings.
 * Recordings are created automatically by the voice pipeline.
 * URLs are pre-signed and expire after a configurable period.
 */
export class RecordingsResource extends WorkspaceScopedResource {
  /** List recordings with optional filtering by call or date range */
  async list(params?: ListRecordingsParams): Promise<PaginatedResponse<Recording>> {
    return this.fetch<PaginatedResponse<Recording>>(`/recordings${buildQuery(params)}`)
  }

  /** Get a single recording with a fresh pre-signed URL */
  async get(recordingId: string): Promise<Recording> {
    return this.fetch<Recording>(`/recordings/${recordingId}`)
  }

  /** Delete a recording permanently */
  async delete(recordingId: string): Promise<void> {
    return this.fetch<void>(`/recordings/${recordingId}`, { method: 'DELETE' })
  }
}
