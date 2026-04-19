import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export class FunctionsResource extends WorkspaceScopedResource {
  async list() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async create(body: components['schemas']['FunctionCreateRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async delete(functionName: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/functions/{function_name}', {
      params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
    })
  }

  async test(functionName: string, body: components['schemas']['FunctionTestRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/test', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  async getCatalog() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/catalog', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async query(body: components['schemas']['QueryRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/query', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async sync() {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/sync', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
