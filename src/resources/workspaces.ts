import type { components } from '../generated/api.js'
import type { WorkspaceId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

/**
 * Manage Amigo Platform workspaces.
 * Workspaces are the top-level tenancy boundary for all resources.
 *
 * Note: list and create operate at account level (/v1/workspaces),
 * while get, update, and archive operate on a specific workspace.
 */
export class WorkspacesResource extends WorkspaceScopedResource {
  /** Create a new workspace */
  async create(body: components['schemas']['CreateWorkspaceRequest']) {
    return extractData(
      await this.client.POST('/v1/workspaces', {
        body,
      }),
    )
  }

  /** List workspaces accessible to the current API key */
  async list(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/workspaces', {
        params: { query: params },
      }),
    )
  }

  listAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single workspace by ID */
  async get(id?: WorkspaceId | string) {
    return extractData(
      await this.client.GET('/v1/workspaces/{workspace_id}', {
        params: { path: { workspace_id: id ?? this.workspaceId } },
      }),
    )
  }

  /** Update workspace metadata */
  async update(body: components['schemas']['UpdateWorkspaceRequest'], id?: WorkspaceId | string) {
    return extractData(
      await this.client.PATCH('/v1/workspaces/{workspace_id}', {
        params: { path: { workspace_id: id ?? this.workspaceId } },
        body,
      }),
    )
  }

  /** Archive (soft-delete) a workspace */
  async archive(body: components['schemas']['ArchiveWorkspaceRequest'], id?: WorkspaceId | string) {
    return extractData(
      await this.client.POST('/v1/workspaces/{workspace_id}/archive', {
        params: { path: { workspace_id: id ?? this.workspaceId } },
        body,
      }),
    )
  }

  /** Provision a workspace (seed integrations, mark as provisioned) */
  async provision(id?: WorkspaceId | string) {
    return extractData(
      await this.client.POST('/v1/workspaces/{workspace_id}/provision', {
        params: { path: { workspace_id: id ?? this.workspaceId } },
      }),
    )
  }

  /** Pre-check environment conversion warnings */
  async checkEnvironment(target?: 'production' | 'staging', id?: WorkspaceId | string) {
    return extractData(
      await this.client.GET('/v1/workspaces/{workspace_id}/environment-check', {
        params: {
          path: { workspace_id: id ?? this.workspaceId },
          query: target ? { target } : undefined,
        },
      }),
    )
  }

  /** Convert workspace between staging and production */
  async convertEnvironment(
    body: components['schemas']['ConvertEnvironmentRequest'],
    id?: WorkspaceId | string,
  ) {
    return extractData(
      await this.client.POST('/v1/workspaces/{workspace_id}/convert-environment', {
        params: { path: { workspace_id: id ?? this.workspaceId } },
        body,
      }),
    )
  }
}
