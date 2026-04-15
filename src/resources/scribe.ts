import type {
  ScribeSession,
  CreateScribeSessionRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { ScribeSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListScribeSessionsParams extends ListParams {
  status?: string
  provider_id?: string
  patient_id?: string
  start_date?: string
  end_date?: string
}

/**
 * Scribe — AI clinical documentation assistant.
 * Records and transcribes clinical encounters, generating structured notes.
 */
export class ScribeResource extends WorkspaceScopedResource {
  /** Start a new scribe session (begins recording) */
  async createSession(body?: CreateScribeSessionRequest): Promise<ScribeSession> {
    return this.fetch<ScribeSession>('/scribe/sessions', {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /** List scribe sessions */
  async listSessions(params?: ListScribeSessionsParams): Promise<PaginatedResponse<ScribeSession>> {
    return this.fetch<PaginatedResponse<ScribeSession>>(`/scribe/sessions${buildQuery(params)}`)
  }

  /** Get a scribe session */
  async getSession(sessionId: ScribeSessionId | string): Promise<ScribeSession> {
    return this.fetch<ScribeSession>(`/scribe/sessions/${sessionId}`)
  }

  /** End a scribe session — triggers transcription and note generation */
  async endSession(sessionId: ScribeSessionId | string): Promise<ScribeSession> {
    return this.fetch<ScribeSession>(`/scribe/sessions/${sessionId}/end`, { method: 'POST' })
  }

  /** Trigger transcription for a session (if not auto-started) */
  async transcribe(sessionId: ScribeSessionId | string): Promise<ScribeSession> {
    return this.fetch<ScribeSession>(`/scribe/sessions/${sessionId}/transcribe`, {
      method: 'POST',
    })
  }
}
