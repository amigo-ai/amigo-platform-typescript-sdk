import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Account-scoped operations for the authenticated identity.
 *
 * "Me" is the SDK-side mirror of platform-api's ``/v1/me/...``
 * namespace — operations that act on the caller's own account
 * (workspaces they own, profile info, …) rather than on a specific
 * workspace they're inside of.
 *
 * Workspace creation lives here, NOT on ``client.workspaces``. The
 * legacy ``client.workspaces.createSelfService`` (which posted to
 * ``/v1/workspaces/self-service``) was removed in SDK 0.27.0 because
 * the route shape confused URL-parsing consumers — the developer-console
 * BFF proxy treated the literal ``self-service`` as a workspace_id
 * and sent identity a JWT-refresh request scoped to that string,
 * which 4xx'd before the call ever reached platform-api.
 *
 * Even though the underlying call is account-scoped, this resource
 * extends ``WorkspaceScopedResource`` to inherit ``withOptions`` /
 * iteration helpers / scoped-client wiring. The bound
 * ``workspaceId`` is unused for the routes here — typically a
 * placeholder like ``"_account"`` from the AmigoClient construction.
 */
export class MeResource extends WorkspaceScopedResource {
  /**
   * Create a workspace owned by the authenticated identity.
   *
   * The caller is bootstrapped as the workspace's owner. Use this
   * method anywhere that previously called
   * ``client.workspaces.createSelfService(body)`` — the request body
   * shape and response are unchanged; only the URL moved.
   */
  async createWorkspace(body: components['schemas']['CreateWorkspaceRequest']) {
    return extractData(
      await this.client.POST('/v1/me/workspaces', {
        body,
      }),
    )
  }
}
