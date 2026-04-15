import type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { ServiceId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListServicesParams extends ListParams {
  search?: string
  type?: string
}

/**
 * Manage services — external service configurations that agents can call.
 * Services represent integrations like scheduling systems, EHRs, or CRMs
 * that skills can interact with via their tool definitions.
 */
export class ServicesResource extends WorkspaceScopedResource {
  async create(body: CreateServiceRequest): Promise<Service> {
    return this.fetch<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListServicesParams): Promise<PaginatedResponse<Service>> {
    return this.fetch<PaginatedResponse<Service>>(`/services${buildQuery(params)}`)
  }

  async get(serviceId: ServiceId | string): Promise<Service> {
    return this.fetch<Service>(`/services/${serviceId}`)
  }

  async update(serviceId: ServiceId | string, body: UpdateServiceRequest): Promise<Service> {
    return this.fetch<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete(serviceId: ServiceId | string): Promise<void> {
    return this.fetch<void>(`/services/${serviceId}`, { method: 'DELETE' })
  }
}
