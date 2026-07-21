import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type UseCaseServiceBinding = components['schemas']['ServiceBindingResponse']
export type BindUseCaseServiceRequest = components['schemas']['ServiceBindingRequest']

/** Service bindings for channel-manager-owned use cases. */
export class UseCasesResource extends WorkspaceScopedResource {
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
