import type { components, paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type UseCase = components['schemas']['UseCaseResponse']
export type UseCaseListResponse = components['schemas']['UseCaseListResponse']
export type OwnedUseCasesResponse = components['schemas']['OwnedUseCasesResponse']
export type UseCaseOwnership = components['schemas']['OwnershipResponse']
export type UseCaseServiceBinding = components['schemas']['ServiceBindingResponse']
export type BindUseCaseServiceRequest = components['schemas']['ServiceBindingRequest']
export type ListUseCasesParams = NonNullable<
  paths['/v1/{workspace_id}/use-cases']['get']['parameters']['query']
>

/**
 * Channel use cases — voice/email/SMS/iMessage channel setup, workspace
 * ownership, and the service binding that activates a use case for runtime
 * traffic.
 */
export class UseCasesResource extends WorkspaceScopedResource {
  /** List use cases in the workspace, optionally filtered by entity/channel/setup. */
  async list(params?: ListUseCasesParams): Promise<UseCaseListResponse> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/use-cases', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** List channel-manager use case IDs owned by the current workspace. */
  async listOwned(): Promise<OwnedUseCasesResponse> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/use-cases/ownership', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Return this workspace's ownership record for a use case. Throws NotFoundError if unowned. */
  async getOwnership(useCaseId: string): Promise<UseCaseOwnership> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/use-cases/{use_case_id}/ownership', {
        params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
      }),
    )
  }

  /** Claim ownership of a channel-manager use case for this workspace. */
  async assignOwnership(useCaseId: string): Promise<UseCaseOwnership> {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/use-cases/{use_case_id}/ownership', {
        params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
      }),
    )
  }

  /** Release this workspace's ownership of a use case after unbinding services. */
  async releaseOwnership(useCaseId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/use-cases/{use_case_id}/ownership', {
      params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
    })
  }

  /** Return the service currently bound to a use case. Throws NotFoundError if unbound. */
  async getServiceBinding(useCaseId: string): Promise<UseCaseServiceBinding> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/use-cases/{use_case_id}/service-binding', {
        params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
      }),
    )
  }

  /** Bind or rebind a use case to the platform service that should handle its traffic. */
  async bindToService(
    useCaseId: string,
    body: BindUseCaseServiceRequest,
  ): Promise<UseCaseServiceBinding> {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/use-cases/{use_case_id}/service-binding', {
        params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
        body,
      }),
    )
  }

  /** Release a use case from its currently bound platform service. */
  async unbindFromService(useCaseId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/use-cases/{use_case_id}/service-binding', {
      params: { path: { workspace_id: this.workspaceId, use_case_id: useCaseId } },
    })
  }
}
