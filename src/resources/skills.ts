import type {
  Skill,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillTestRequest,
  SkillTestResponse,
  PaginatedResponse,
} from '../types/api.js'
import type { SkillId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListSkillsParams extends ListParams {
  search?: string
  enabled?: boolean
  execution_tier?: string
}

/**
 * Manage skills — reusable AI capabilities that agents can call.
 * Skills define a structured input/output schema and an execution tier.
 */
export class SkillsResource extends WorkspaceScopedResource {
  /** Create a new skill */
  async create(body: CreateSkillRequest): Promise<Skill> {
    return this.fetch<Skill>('/skills', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List skills in the workspace */
  async list(params?: ListSkillsParams): Promise<PaginatedResponse<Skill>> {
    return this.fetch<PaginatedResponse<Skill>>(`/skills${buildQuery(params)}`)
  }

  /** Get a single skill */
  async get(skillId: SkillId | string): Promise<Skill> {
    return this.fetch<Skill>(`/skills/${skillId}`)
  }

  /** Update a skill */
  async update(skillId: SkillId | string, body: UpdateSkillRequest): Promise<Skill> {
    return this.fetch<Skill>(`/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete a skill */
  async delete(skillId: SkillId | string): Promise<void> {
    return this.fetch<void>(`/skills/${skillId}`, { method: 'DELETE' })
  }

  /**
   * Test a skill with a sample input.
   * Executes the skill in a sandbox and returns the result.
   */
  async test(skillId: SkillId | string, body: SkillTestRequest): Promise<SkillTestResponse> {
    return this.fetch<SkillTestResponse>(`/skills/${skillId}/test`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}
