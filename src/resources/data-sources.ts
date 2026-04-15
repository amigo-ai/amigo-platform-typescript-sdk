import type {
  DataSource,
  CreateDataSourceRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { DataSourceId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListDataSourcesParams extends ListParams {
  type?: string
  status?: string
}

export interface UpdateDataSourceRequest {
  name?: string
  connection_config?: Record<string, unknown>
}

/**
 * Manage data sources — connections to external databases, warehouses,
 * or data feeds that the platform can query and sync from.
 */
export class DataSourcesResource extends WorkspaceScopedResource {
  async create(body: CreateDataSourceRequest): Promise<DataSource> {
    return this.fetch<DataSource>('/data-sources', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListDataSourcesParams): Promise<PaginatedResponse<DataSource>> {
    return this.fetch<PaginatedResponse<DataSource>>(`/data-sources${buildQuery(params)}`)
  }

  async get(dataSourceId: DataSourceId | string): Promise<DataSource> {
    return this.fetch<DataSource>(`/data-sources/${dataSourceId}`)
  }

  async update(dataSourceId: DataSourceId | string, body: UpdateDataSourceRequest): Promise<DataSource> {
    return this.fetch<DataSource>(`/data-sources/${dataSourceId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete(dataSourceId: DataSourceId | string): Promise<void> {
    return this.fetch<void>(`/data-sources/${dataSourceId}`, { method: 'DELETE' })
  }
}
