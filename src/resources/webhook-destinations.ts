import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export class WebhookDestinationsResource extends WorkspaceScopedResource {
  async list(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/webhook-destinations', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  async create(body: components['schemas']['CreateWebhookDestinationRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/webhook-destinations', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async get(destinationId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/webhook-destinations/{destination_id}', {
        params: { path: { workspace_id: this.workspaceId, destination_id: destinationId } },
      }),
    )
  }

  async update(
    destinationId: string,
    body: components['schemas']['UpdateWebhookDestinationRequest'],
  ) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/webhook-destinations/{destination_id}', {
        params: { path: { workspace_id: this.workspaceId, destination_id: destinationId } },
        body,
      }),
    )
  }

  async delete(destinationId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/webhook-destinations/{destination_id}', {
      params: { path: { workspace_id: this.workspaceId, destination_id: destinationId } },
    })
  }

  async listDeliveries(destinationId: string, params?: ListParams) {
    return extractData(
      await this.client.GET(
        '/v1/{workspace_id}/webhook-destinations/{destination_id}/deliveries',
        {
          params: {
            path: { workspace_id: this.workspaceId, destination_id: destinationId },
            query: params,
          },
        },
      ),
    )
  }

  listDeliveriesAutoPaging(destinationId: string, params?: ListParams) {
    return this.iteratePaginatedList(
      (pageParams) => this.listDeliveries(destinationId, pageParams),
      params,
    )
  }

  async rotateSecret(destinationId: string) {
    return extractData(
      await this.client.POST(
        '/v1/{workspace_id}/webhook-destinations/{destination_id}/rotate-secret',
        {
          params: { path: { workspace_id: this.workspaceId, destination_id: destinationId } },
        },
      ),
    )
  }
}
