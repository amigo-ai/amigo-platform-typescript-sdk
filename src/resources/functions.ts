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

  async get(functionName: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/{function_name}', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
      }),
    )
  }

  async deploy(functionName: string, body: components['schemas']['RegisteredFunction']) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/functions/{function_name}', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  async delete(functionName: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/functions/{function_name}', {
      params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
    })
  }

  async invoke(functionName: string, body: components['schemas']['InvokeRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/invoke', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  async test(
    functionName: string,
    body: components['schemas']['InvokeRequest'],
  ): Promise<components['schemas']['TestInvokeResponse']> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/test', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }
}
