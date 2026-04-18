import type { components } from '../generated/api.js'
import type { ContextGraphId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListContextGraphsParams extends ListParams {
  search?: string
}

/**
 * Manage context graphs — structured conversation flow definitions (HSM).
 * Context graphs define the states, transitions, and conditions that
 * govern how an agent moves through a conversation.
 */
export class ContextGraphsResource extends WorkspaceScopedResource {
  async create(body: components['schemas']['CreateContextGraphRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/context-graphs', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async list(params?: ListContextGraphsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/context-graphs', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async get(contextGraphId: ContextGraphId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/context-graphs/{context_graph_id}', {
        params: {
          path: { workspace_id: this.workspaceId, context_graph_id: contextGraphId },
        },
      }),
    )
  }

  async update(
    contextGraphId: ContextGraphId | string,
    body: components['schemas']['UpdateContextGraphRequest'],
  ) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/context-graphs/{context_graph_id}', {
        params: {
          path: { workspace_id: this.workspaceId, context_graph_id: contextGraphId },
        },
        body,
      }),
    )
  }

  async delete(contextGraphId: ContextGraphId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/context-graphs/{context_graph_id}', {
      params: {
        path: { workspace_id: this.workspaceId, context_graph_id: contextGraphId },
      },
    })
  }

  /** Create a version snapshot of the current context graph */
  async createVersion(
    contextGraphId: ContextGraphId | string,
    body: components['schemas']['CreateContextGraphVersionRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/context-graphs/{context_graph_id}/versions', {
        params: {
          path: { workspace_id: this.workspaceId, context_graph_id: contextGraphId },
        },
        body,
      }),
    )
  }

  /** List all versions of a context graph */
  async listVersions(contextGraphId: ContextGraphId | string, params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/context-graphs/{context_graph_id}/versions', {
        params: {
          path: { workspace_id: this.workspaceId, context_graph_id: contextGraphId },
          query: params,
        },
      }),
    )
  }

  /** Get a specific version */
  async getVersion(contextGraphId: ContextGraphId | string, version: number) {
    return extractData(
      await this.client.GET(
        '/v1/{workspace_id}/context-graphs/{context_graph_id}/versions/{version}',
        {
          params: {
            path: {
              workspace_id: this.workspaceId,
              context_graph_id: contextGraphId,
              version,
            },
          },
        },
      ),
    )
  }
}
