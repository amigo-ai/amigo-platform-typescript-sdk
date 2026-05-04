import type { components, paths } from '../generated/api.js'
import type { ActionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

// Derived from the generated query type so ``execution_tier`` stays in
// sync with the platform-api Literal union (currently
// ``"direct" | "orchestrated" | "autonomous" | "browser" | "computer_use"``)
// and any future tier the spec adds. The pre-#175 hand-rolled
// ``execution_tier?: string`` was too loose and broke ``tsc`` when
// platform-api PR #2520 tightened the parameter to a Literal.
// Mirrors the ``monitor-concepts.ts`` pattern.
export type ListActionsParams = NonNullable<
  paths['/v1/{workspace_id}/skills']['get']['parameters']['query']
>

/**
 * Manage actions — reusable AI capabilities that agents can call.
 * Actions define a structured input/output schema and an execution tier.
 *
 * Note: The underlying API paths use `/skills/` for backward compatibility.
 */
export class ActionsResource extends WorkspaceScopedResource {
  /** Create a new action */
  async create(body: components['schemas']['CreateSkillRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/skills', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List actions in the workspace */
  async list(params?: ListActionsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/skills', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListActionsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single action */
  async get(actionId: ActionId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/skills/{skill_id}', {
        params: { path: { workspace_id: this.workspaceId, skill_id: actionId } },
      }),
    )
  }

  /** Update an action */
  async update(actionId: ActionId | string, body: components['schemas']['UpdateSkillRequest']) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/skills/{skill_id}', {
        params: { path: { workspace_id: this.workspaceId, skill_id: actionId } },
        body,
      }),
    )
  }

  /** Delete an action */
  async delete(actionId: ActionId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/skills/{skill_id}', {
      params: { path: { workspace_id: this.workspaceId, skill_id: actionId } },
    })
  }

  /** Get all context graphs and services that reference this action */
  async getReferences(actionId: ActionId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/skills/{skill_id}/references', {
        params: { path: { workspace_id: this.workspaceId, skill_id: actionId } },
      }),
    )
  }

  /**
   * Test an action with a sample input.
   * Executes the action in a sandbox and returns the result.
   */
  async test(actionId: ActionId | string, body: components['schemas']['TestSkillRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/skills/{skill_id}/test', {
        params: { path: { workspace_id: this.workspaceId, skill_id: actionId } },
        body,
      }),
    )
  }
}
