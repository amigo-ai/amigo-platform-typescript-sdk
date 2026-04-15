import type {
  ContextGraph,
  CreateContextGraphRequest,
  UpdateContextGraphRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { ContextGraphId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListContextGraphsParams extends ListParams {
  search?: string
}

export interface ContextGraphVersion {
  context_graph_id: string
  version: number
  schema_snapshot: Record<string, unknown>
  created_at: string
}

/**
 * Manage context graphs — structured conversation flow definitions (HSM).
 * Context graphs define the states, transitions, and conditions that
 * govern how an agent moves through a conversation.
 */
export class ContextGraphsResource extends WorkspaceScopedResource {
  async create(body: CreateContextGraphRequest): Promise<ContextGraph> {
    return this.fetch<ContextGraph>('/context-graphs', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListContextGraphsParams): Promise<PaginatedResponse<ContextGraph>> {
    return this.fetch<PaginatedResponse<ContextGraph>>(`/context-graphs${buildQuery(params)}`)
  }

  async get(contextGraphId: ContextGraphId | string): Promise<ContextGraph> {
    return this.fetch<ContextGraph>(`/context-graphs/${contextGraphId}`)
  }

  async update(
    contextGraphId: ContextGraphId | string,
    body: UpdateContextGraphRequest,
  ): Promise<ContextGraph> {
    return this.fetch<ContextGraph>(`/context-graphs/${contextGraphId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete(contextGraphId: ContextGraphId | string): Promise<void> {
    return this.fetch<void>(`/context-graphs/${contextGraphId}`, { method: 'DELETE' })
  }

  /** Create a version snapshot of the current context graph */
  async createVersion(contextGraphId: ContextGraphId | string): Promise<ContextGraphVersion> {
    return this.fetch<ContextGraphVersion>(`/context-graphs/${contextGraphId}/versions`, {
      method: 'POST',
    })
  }

  /** List all versions of a context graph */
  async listVersions(
    contextGraphId: ContextGraphId | string,
    params?: ListParams,
  ): Promise<PaginatedResponse<ContextGraphVersion>> {
    return this.fetch<PaginatedResponse<ContextGraphVersion>>(
      `/context-graphs/${contextGraphId}/versions${buildQuery(params)}`,
    )
  }

  /** Get a specific version */
  async getVersion(contextGraphId: ContextGraphId | string, version: number): Promise<ContextGraphVersion> {
    return this.fetch<ContextGraphVersion>(`/context-graphs/${contextGraphId}/versions/${version}`)
  }
}
