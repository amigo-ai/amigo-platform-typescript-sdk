import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

type OpenApiResult<T> = {
  data?: T
  error?: unknown
  response?: Response
}

type ForkStatus = {
  endpoint?: string
  status?: string
  ttl_days?: number
  [key: string]: unknown
}

type QueryResult = {
  columns?: string[]
  rows?: unknown[]
  row_count?: number
  [key: string]: unknown
}

type QueryTool = {
  id?: string
  workspace_id?: string
  name?: string
  description?: string | null
  query?: string
  parameters?: Record<string, unknown>
  enabled?: boolean
  target?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

type QueryToolList = {
  items: QueryTool[]
  has_more?: boolean
  continuation_token?: number | null
}

type JsonObject = Record<string, unknown>

export class WorkspaceDatabaseResource extends WorkspaceScopedResource {
  private get<T>(path: string, init?: object): Promise<OpenApiResult<T>> {
    return this.client.GET(path as never, init as never) as Promise<OpenApiResult<T>>
  }

  private post<T>(path: string, init?: object): Promise<OpenApiResult<T>> {
    return this.client.POST(path as never, init as never) as Promise<OpenApiResult<T>>
  }

  private patch<T>(path: string, init?: object): Promise<OpenApiResult<T>> {
    return this.client.PATCH(path as never, init as never) as Promise<OpenApiResult<T>>
  }

  private delete(path: string, init?: object): Promise<OpenApiResult<void>> {
    return this.client.DELETE(path as never, init as never) as Promise<OpenApiResult<void>>
  }

  // -- Fork lifecycle -------------------------------------------------------

  async getFork() {
    return extractData(
      await this.get<ForkStatus>('/v1/{workspace_id}/fork', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async createFork(body: JsonObject) {
    return extractData(
      await this.post<ForkStatus>('/v1/{workspace_id}/fork', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async deleteFork(): Promise<void> {
    await this.delete('/v1/{workspace_id}/fork', {
      params: { path: { workspace_id: this.workspaceId } },
    })
  }

  // -- Query execution ------------------------------------------------------

  async executeQuery(body: JsonObject) {
    return extractData(
      await this.post<QueryResult>('/v1/{workspace_id}/lakebase/query', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  // -- Query tool CRUD ------------------------------------------------------

  async listQueryTools(params?: ListParams) {
    return extractData(
      await this.get<QueryToolList>('/v1/{workspace_id}/query-tools', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listQueryToolsAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.listQueryTools(pageParams), params)
  }

  async createQueryTool(body: JsonObject) {
    return extractData(
      await this.post<QueryTool>('/v1/{workspace_id}/query-tools', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async updateQueryTool(toolId: string, body: JsonObject) {
    return extractData(
      await this.patch<QueryTool>('/v1/{workspace_id}/query-tools/{tool_id}', {
        params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
        body,
      }),
    )
  }

  async deleteQueryTool(toolId: string): Promise<void> {
    await this.delete('/v1/{workspace_id}/query-tools/{tool_id}', {
      params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
    })
  }

  async testQueryTool(toolId: string, body: JsonObject) {
    return extractData(
      await this.post<QueryResult>('/v1/{workspace_id}/query-tools/{tool_id}/test', {
        params: { path: { workspace_id: this.workspaceId, tool_id: toolId } },
        body,
      }),
    )
  }
}
