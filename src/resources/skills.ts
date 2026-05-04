import type { components, paths } from '../generated/api.js'
import type { SkillId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

type SkillsListQuery = NonNullable<
  NonNullable<paths['/v1/{workspace_id}/skills']['get']['parameters']['query']>
>

export interface ListSkillsParams extends ListParams {
  search?: string
  enabled?: boolean
  execution_tier?: SkillsListQuery['execution_tier']
}

/**
 * Manage skills — reusable AI capabilities that agents can call.
 * Skills define a structured input/output schema and an execution tier.
 */
export class SkillsResource extends WorkspaceScopedResource {
  /** Create a new skill */
  async create(body: components['schemas']['CreateSkillRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/skills', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List skills in the workspace */
  async list(params?: ListSkillsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/skills', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListSkillsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single skill */
  async get(skillId: SkillId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/skills/{skill_id}', {
        params: { path: { workspace_id: this.workspaceId, skill_id: skillId } },
      }),
    )
  }

  /** Update a skill */
  async update(skillId: SkillId | string, body: components['schemas']['UpdateSkillRequest']) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/skills/{skill_id}', {
        params: { path: { workspace_id: this.workspaceId, skill_id: skillId } },
        body,
      }),
    )
  }

  /** Delete a skill */
  async delete(skillId: SkillId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/skills/{skill_id}', {
      params: { path: { workspace_id: this.workspaceId, skill_id: skillId } },
    })
  }

  /**
   * Test a skill with a sample input.
   * Executes the skill in a sandbox and returns the result.
   */
  async test(skillId: SkillId | string, body: components['schemas']['TestSkillRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/skills/{skill_id}/test', {
        params: { path: { workspace_id: this.workspaceId, skill_id: skillId } },
        body,
      }),
    )
  }
}
