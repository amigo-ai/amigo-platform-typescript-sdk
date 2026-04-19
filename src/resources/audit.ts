import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export interface ListAuditParams {
  service?: string | null
  action?: string | null
  actor_entity_id?: string | null
  resource_type?: string | null
  resource_id?: string | null
  phi_only?: boolean
  date_from?: string | null
  date_to?: string | null
  limit?: number
  offset?: number
}

export interface PhiAccessParams {
  entity_id?: string | null
  date_from?: string | null
  date_to?: string | null
  limit?: number
  offset?: number
}

export interface EntityAccessLogParams {
  date_from?: string | null
  date_to?: string | null
  limit?: number
  offset?: number
}

export class AuditResource extends WorkspaceScopedResource {
  async list(params?: ListAuditParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/audit', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async getSummary(params?: { date_from?: string | null; date_to?: string | null }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/audit/summary', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async getPhiAccess(params?: PhiAccessParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/audit/phi-access', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async createExport(body: components['schemas']['AuditExportRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/audit/export', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async listExports() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/audit/exports', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async getEntityAccessLog(entityId: string, params?: EntityAccessLogParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/audit/entity/{entity_id}/access-log', {
        params: { path: { workspace_id: this.workspaceId, entity_id: entityId }, query: params },
      }),
    )
  }
}
