import type { components } from '../generated/api.js'
import type { IntegrationId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListIntegrationsParams extends ListParams {
  protocol?: string
  enabled?: boolean
  search?: string
}

/**
 * Manage integrations — connections to external systems (EHRs, CRMs, etc.).
 * Integrations power connector data acquisition and skill tool calls.
 */
export class IntegrationsResource extends WorkspaceScopedResource {
  /** Create a new integration */
  async create(body: components['schemas']['CreateIntegrationRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/integrations', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List integrations */
  async list(params?: ListIntegrationsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/integrations', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListIntegrationsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a single integration */
  async get(integrationId: IntegrationId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/integrations/{integration_id}', {
        params: { path: { workspace_id: this.workspaceId, integration_id: integrationId } },
      }),
    )
  }

  /** Update integration configuration */
  async update(
    integrationId: IntegrationId | string,
    body: components['schemas']['UpdateIntegrationRequest'],
  ) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/integrations/{integration_id}', {
        params: { path: { workspace_id: this.workspaceId, integration_id: integrationId } },
        body,
      }),
    )
  }

  /** Delete an integration */
  async delete(integrationId: IntegrationId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/integrations/{integration_id}', {
      params: { path: { workspace_id: this.workspaceId, integration_id: integrationId } },
    })
  }

  /**
   * Test a specific endpoint on an integration with given params.
   * Used in the developer console to validate integration config.
   */
  async testEndpoint(
    integrationId: IntegrationId | string,
    endpointName: string,
    body: components['schemas']['TestEndpointRequest'],
  ) {
    return extractData(
      await this.client.POST(
        '/v1/{workspace_id}/integrations/{integration_id}/endpoints/{endpoint_name}/test',
        {
          params: {
            path: {
              workspace_id: this.workspaceId,
              integration_id: integrationId,
              endpoint_name: endpointName,
            },
          },
          body,
        },
      ),
    )
  }

  /** Check health of all integrations in the workspace */
  async getHealthCheck() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/integrations/health-check', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
