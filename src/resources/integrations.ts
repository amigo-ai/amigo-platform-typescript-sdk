import type {
  Integration,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { IntegrationId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListIntegrationsParams extends ListParams {
  protocol?: string
  enabled?: boolean
  search?: string
}

export interface IntegrationTestResult {
  success: boolean
  message: string
  latency_ms: number
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

  /**
   * Test a specific endpoint on an integration with given params.
   * Used in the developer console to validate integration config.
   */
  async testEndpoint(
    integrationId: IntegrationId | string,
    endpointName: string,
    params: Record<string, unknown>,
  ): Promise<IntegrationTestResult> {
    return this.fetch<IntegrationTestResult>(
      `/integrations/${integrationId}/endpoints/${endpointName}/test`,
      { method: 'POST', body: JSON.stringify({ params }) },
    )
  }

  /** Check health of all integrations in the workspace */
  async getHealthCheck(): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>('/integrations/health-check')
  }
}
