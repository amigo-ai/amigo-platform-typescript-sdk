import type { components, paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type ListSurfacesParams = NonNullable<
  paths['/v1/{workspace_id}/surfaces']['get']['parameters']['query']
>

/**
 * Surfaces — short-lived form/intake experiences the platform delivers via
 * SMS / email / web. The full lifecycle is exposed: create, deliver, monitor
 * progress, gate for review, approve / reject / reshape, and archive.
 *
 * @beta New in this release; surface may evolve as the operator review flow
 * stabilizes.
 */
export class SurfacesResource extends WorkspaceScopedResource {
  /** List surfaces in the workspace */
  async list(params?: ListSurfacesParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/surfaces', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListSurfacesParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Surfaces awaiting review (pending approval / rejection) */
  async listForReview(params?: ListSurfacesParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/surfaces/review', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Create a surface (form definition + delivery config) */
  async create(body: components['schemas']['CreateSurfaceRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/surfaces', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Get a single surface */
  async get(surfaceId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/surfaces/{surface_id}', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
      }),
    )
  }

  /** Update surface metadata or fields */
  async update(surfaceId: string, body: components['schemas']['UpdateSurfaceRequest']) {
    return extractData(
      await this.client.PATCH('/v1/{workspace_id}/surfaces/{surface_id}', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
        body,
      }),
    )
  }

  /** Archive (soft-delete) a surface */
  async archive(surfaceId: string) {
    return extractData(
      await this.client.DELETE('/v1/{workspace_id}/surfaces/{surface_id}', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
      }),
    )
  }

  /** Deliver the surface to the recipient (SMS/email/etc.) */
  async deliver(surfaceId: string, body: components['schemas']['DeliverSurfaceRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/surfaces/{surface_id}/deliver', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
        body,
      }),
    )
  }

  /** Get fill / completion progress for a surface */
  async getProgress(surfaceId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/surfaces/{surface_id}/progress', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
      }),
    )
  }

  /** Approve a pending-review surface */
  async approve(surfaceId: string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/surfaces/{surface_id}/approve', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
      }),
    )
  }

  /** Reject a pending-review surface */
  async reject(surfaceId: string, body: components['schemas']['RejectSurfaceRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/surfaces/{surface_id}/reject', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
        body,
      }),
    )
  }

  /** Reshape — clone the surface with refined fields (review redirect) */
  async reshape(surfaceId: string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/surfaces/{surface_id}/reshape', {
        params: { path: { workspace_id: this.workspaceId, surface_id: surfaceId } },
      }),
    )
  }
}
