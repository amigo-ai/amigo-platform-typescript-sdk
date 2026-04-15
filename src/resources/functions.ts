import type {
  PlatformFunction,
  CreateFunctionRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { FunctionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListFunctionsParams extends ListParams {
  search?: string
}

export interface UpdateFunctionRequest {
  description?: string
  input_schema?: Record<string, unknown>
  implementation?: string
}

/**
 * Manage custom functions — agent-authored or user-defined tool implementations
 * that can be called by skills during execution.
 */
export class FunctionsResource extends WorkspaceScopedResource {
  async create(body: CreateFunctionRequest): Promise<PlatformFunction> {
    return this.fetch<PlatformFunction>('/functions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListFunctionsParams): Promise<PaginatedResponse<PlatformFunction>> {
    return this.fetch<PaginatedResponse<PlatformFunction>>(`/functions${buildQuery(params)}`)
  }

  async get(functionId: FunctionId | string): Promise<PlatformFunction> {
    return this.fetch<PlatformFunction>(`/functions/${functionId}`)
  }

  async delete(functionId: FunctionId | string): Promise<void> {
    return this.fetch<void>(`/functions/${functionId}`, { method: 'DELETE' })
  }
}
