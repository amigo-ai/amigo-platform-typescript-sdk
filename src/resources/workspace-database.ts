import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export class WorkspaceDatabaseResource extends WorkspaceScopedResource {
  // -- Fork lifecycle -------------------------------------------------------

  async getFork() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fork', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async createFork(body: components['schemas']['CreateForkRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/fork', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async deleteFork(): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/fork', {
      params: { path: { workspace_id: this.workspaceId } },
    })
  }

  // -- Query execution ------------------------------------------------------

  async executeQuery(body: components['schemas']['ExecuteQueryRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/lakebase/query', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  // -- Query tool CRUD ------------------------------------------------------

  async listQueryTools(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/query-tools', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listQueryToolsAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.listQueryTools(pageParams), params)
  }

  async createQueryTool(body: components['schemas']['CreateToolRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/query-tools', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async updateQueryTool(toolId: string, body: components['schemas']['UpdateToolRequest']) {
    return extractData(
      await this.client.PATCH('/v1/{workspace_id}/query-tools/{tool_id}', {
        params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
        body,
      }),
    )
  }

  async deleteQueryTool(toolId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/query-tools/{tool_id}', {
      params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
    })
  }

  async testQueryTool(toolId: string, body: components['schemas']['TestToolRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/query-tools/{tool_id}/test', {
        params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
        body,
      }),
    )
  }
}
