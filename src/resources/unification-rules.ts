import type { components, paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type ListUnificationRulesParams = NonNullable<
  paths['/v1/{workspace_id}/unification-rules']['get']['parameters']['query']
>

/**
 * Manage entity unification rules — declarative joins that fold duplicate
 * world-model entities into a single canonical record. Rules are evaluated
 * on ingest; the surviving entity inherits properties from its merge sources.
 *
 * @beta New in this release; surface may evolve.
 */
export class UnificationRulesResource extends WorkspaceScopedResource {
  /** Create a new unification rule */
  async create(body: components['schemas']['CreateUnificationRuleRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/unification-rules', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List unification rules in the workspace */
  async list(params?: ListUnificationRulesParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/unification-rules', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListUnificationRulesParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single unification rule */
  async get(ruleId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/unification-rules/{rule_id}', {
        params: { path: { workspace_id: this.workspaceId, rule_id: ruleId } },
      }),
    )
  }

  /** Update a unification rule */
  async update(ruleId: string, body: components['schemas']['UpdateUnificationRuleRequest']) {
    return extractData(
      await this.client.PATCH('/v1/{workspace_id}/unification-rules/{rule_id}', {
        params: { path: { workspace_id: this.workspaceId, rule_id: ruleId } },
        body,
      }),
    )
  }

  /** Delete a unification rule */
  async delete(ruleId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/unification-rules/{rule_id}', {
      params: { path: { workspace_id: this.workspaceId, rule_id: ruleId } },
    })
  }
}
