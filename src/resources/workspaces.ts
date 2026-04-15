import type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { WorkspaceId } from '../core/branded-types.js'
import { createApiError } from '../core/errors.js'
import { buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface WorkspacesConfig {
  apiKey: string
  baseUrl: string
}

/**
 * Manage Amigo Platform workspaces.
 * Workspaces are the top-level tenancy boundary for all resources.
 */
export class WorkspacesResource {
  constructor(private readonly config: WorkspacesConfig) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/v1/workspaces${path}`
    const response = await globalThis.fetch(url, {
      ...init,
      headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) },
    })
    if (!response.ok) throw await createApiError(response)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  /** Create a new workspace */
  async create(body: CreateWorkspaceRequest): Promise<Workspace> {
    return this.request<Workspace>('', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List workspaces accessible to the current API key */
  async list(params?: ListParams): Promise<PaginatedResponse<Workspace>> {
    return this.request<PaginatedResponse<Workspace>>(buildQuery(params))
  }

  /** Get a single workspace by ID */
  async get(id: WorkspaceId | string): Promise<Workspace> {
    return this.request<Workspace>(`/${id}`)
  }

  /** Update workspace metadata */
  async update(id: WorkspaceId | string, body: UpdateWorkspaceRequest): Promise<Workspace> {
    return this.request<Workspace>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Archive (soft-delete) a workspace */
  async delete(id: WorkspaceId | string): Promise<void> {
    return this.request<void>(`/${id}`, { method: 'DELETE' })
  }
}
