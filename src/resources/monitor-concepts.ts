import type { components, paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type ListMonitorConceptsParams = NonNullable<
  paths['/v1/{workspace_id}/monitor-concepts']['get']['parameters']['query']
>

/**
 * Manage workspace monitor concepts — semantic patterns the platform watches
 * across calls to surface emerging behavior. Each concept holds a name,
 * description, and detection rules; the platform indexes them and lights
 * them up against live and historical traffic.
 *
 * @beta New in this release; surface may evolve.
 */
export class MonitorConceptsResource extends WorkspaceScopedResource {
  /** Create a new monitor concept */
  async create(body: components['schemas']['CreateMonitorConceptRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/monitor-concepts', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List monitor concepts in the workspace */
  async list(params?: ListMonitorConceptsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/monitor-concepts', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListMonitorConceptsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single monitor concept */
  async get(conceptId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/monitor-concepts/{concept_id}', {
        params: { path: { workspace_id: this.workspaceId, concept_id: conceptId } },
      }),
    )
  }

  /** Update a monitor concept */
  async update(conceptId: string, body: components['schemas']['UpdateMonitorConceptRequest']) {
    return extractData(
      await this.client.PATCH('/v1/{workspace_id}/monitor-concepts/{concept_id}', {
        params: { path: { workspace_id: this.workspaceId, concept_id: conceptId } },
        body,
      }),
    )
  }

  /** Delete a monitor concept */
  async delete(conceptId: string) {
    return extractData(
      await this.client.DELETE('/v1/{workspace_id}/monitor-concepts/{concept_id}', {
        params: { path: { workspace_id: this.workspaceId, concept_id: conceptId } },
      }),
    )
  }
}
