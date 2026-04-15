import type {
  Surface,
  CreateSurfaceRequest,
  UpdateSurfaceRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { SurfaceId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListSurfacesParams extends ListParams {
  type?: string
  is_active?: boolean
}

/**
 * Manage surfaces — patient-facing forms, calendars, and chat interfaces.
 */
export class SurfacesResource extends WorkspaceScopedResource {
  /** Create a new surface */
  async create(body: CreateSurfaceRequest): Promise<Surface> {
    return this.fetch<Surface>('/surfaces', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List surfaces */
  async list(params?: ListSurfacesParams): Promise<PaginatedResponse<Surface>> {
    return this.fetch<PaginatedResponse<Surface>>(`/surfaces${buildQuery(params)}`)
  }

  /** Get a single surface */
  async get(surfaceId: SurfaceId | string): Promise<Surface> {
    return this.fetch<Surface>(`/surfaces/${surfaceId}`)
  }

  /** Update a surface */
  async update(surfaceId: SurfaceId | string, body: UpdateSurfaceRequest): Promise<Surface> {
    return this.fetch<Surface>(`/surfaces/${surfaceId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete a surface */
  async delete(surfaceId: SurfaceId | string): Promise<void> {
    return this.fetch<void>(`/surfaces/${surfaceId}`, { method: 'DELETE' })
  }
}
