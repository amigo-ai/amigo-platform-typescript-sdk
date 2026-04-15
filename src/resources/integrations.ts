import type {
  Integration,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  IntegrationTestResponse,
  IntegrationSyncResponse,
  PaginatedResponse,
} from '../types/api.js'
import type { IntegrationId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListIntegrationsParams extends ListParams {
  type?: string
  status?: string
}

/**
 * Manage integrations — connections to external systems (EHRs, CRMs, etc.).
 * Integrations power connector data acquisition and skill tool calls.
 */
export class IntegrationsResource extends WorkspaceScopedResource {
  /** Create a new integration */
  async create(body: CreateIntegrationRequest): Promise<Integration> {
    return this.fetch<Integration>('/integrations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List integrations */
  async list(params?: ListIntegrationsParams): Promise<PaginatedResponse<Integration>> {
    return this.fetch<PaginatedResponse<Integration>>(`/integrations${buildQuery(params)}`)
  }

  /** Get a single integration */
  async get(integrationId: IntegrationId | string): Promise<Integration> {
    return this.fetch<Integration>(`/integrations/${integrationId}`)
  }

  /** Update integration configuration */
  async update(integrationId: IntegrationId | string, body: UpdateIntegrationRequest): Promise<Integration> {
    return this.fetch<Integration>(`/integrations/${integrationId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete an integration */
  async delete(integrationId: IntegrationId | string): Promise<void> {
    return this.fetch<void>(`/integrations/${integrationId}`, { method: 'DELETE' })
  }

  /** Test the integration connection — verifies credentials without syncing */
  async test(integrationId: IntegrationId | string): Promise<IntegrationTestResponse> {
    return this.fetch<IntegrationTestResponse>(`/integrations/${integrationId}/test`, {
      method: 'POST',
    })
  }

  /** Trigger a manual data sync for the integration */
  async sync(integrationId: IntegrationId | string): Promise<IntegrationSyncResponse> {
    return this.fetch<IntegrationSyncResponse>(`/integrations/${integrationId}/sync`, {
      method: 'POST',
    })
  }
}
