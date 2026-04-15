import type {
  Agent,
  AgentVersion,
  CreateAgentRequest,
  UpdateAgentRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { AgentId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListAgentsParams extends ListParams {
  search?: string
  is_active?: boolean
}

export interface ListAgentVersionsParams extends ListParams {
  version?: number
}

/**
 * Manage agents — the AI personas that handle calls and interactions.
 * Each agent can be assigned skills, a persona, and a model.
 */
export class AgentsResource extends WorkspaceScopedResource {
  /** Create a new agent */
  async create(body: CreateAgentRequest): Promise<Agent> {
    return this.fetch<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List agents in the workspace */
  async list(params?: ListAgentsParams): Promise<PaginatedResponse<Agent>> {
    return this.fetch<PaginatedResponse<Agent>>(`/agents${buildQuery(params)}`)
  }

  /** Get a single agent */
  async get(agentId: AgentId | string): Promise<Agent> {
    return this.fetch<Agent>(`/agents/${agentId}`)
  }

  /** Update an agent's configuration */
  async update(agentId: AgentId | string, body: UpdateAgentRequest): Promise<Agent> {
    return this.fetch<Agent>(`/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete an agent */
  async delete(agentId: AgentId | string): Promise<void> {
    return this.fetch<void>(`/agents/${agentId}`, { method: 'DELETE' })
  }

  /** Create a new version snapshot of the agent's current config */
  async createVersion(agentId: AgentId | string): Promise<AgentVersion> {
    return this.fetch<AgentVersion>(`/agents/${agentId}/versions`, { method: 'POST' })
  }

  /** List all versions of an agent */
  async listVersions(
    agentId: AgentId | string,
    params?: ListAgentVersionsParams,
  ): Promise<PaginatedResponse<AgentVersion>> {
    return this.fetch<PaginatedResponse<AgentVersion>>(
      `/agents/${agentId}/versions${buildQuery(params)}`,
    )
  }

  /** Get a specific version of an agent */
  async getVersion(agentId: AgentId | string, version: number): Promise<AgentVersion> {
    return this.fetch<AgentVersion>(`/agents/${agentId}/versions/${version}`)
  }
}
