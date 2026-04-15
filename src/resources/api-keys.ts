import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  RotateApiKeyResponse,
  AuthMeResponse,
  PaginatedResponse,
} from '../types/api.js'
import type { ApiKeyId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'
import { createApiError } from '../core/errors.js'

/**
 * Manage API keys for a workspace.
 *
 * API keys are used to authenticate SDK/API requests. Each key has a role
 * and a set of permissions. Keys expire after 1-90 days.
 */
export class ApiKeysResource extends WorkspaceScopedResource {
  /**
   * Get info about the currently authenticated API key.
   * Does not require a workspace ID in the path.
   */
  async me(): Promise<AuthMeResponse> {
    const url = `${this.config.baseUrl}/v1/auth/me`
    const response = await globalThis.fetch(url, { headers: this.headers })
    if (!response.ok) throw await createApiError(response)
    return response.json() as Promise<AuthMeResponse>
  }

  /** Create a new API key */
  async create(body: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.fetch<CreateApiKeyResponse>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List API keys in the workspace */
  async list(params?: ListParams): Promise<PaginatedResponse<ApiKey>> {
    return this.fetch<PaginatedResponse<ApiKey>>(`/api-keys${buildQuery(params)}`)
  }

  /** Get a specific API key */
  async get(keyId: ApiKeyId | string): Promise<ApiKey> {
    return this.fetch<ApiKey>(`/api-keys/${keyId}`)
  }

  /** Revoke an API key */
  async revoke(keyId: ApiKeyId | string): Promise<void> {
    return this.fetch<void>(`/api-keys/${keyId}`, { method: 'DELETE' })
  }

  /** Rotate an API key — invalidates the old key and issues a new one */
  async rotate(keyId: ApiKeyId | string): Promise<RotateApiKeyResponse> {
    return this.fetch<RotateApiKeyResponse>(`/api-keys/${keyId}/rotate`, { method: 'POST' })
  }
}
