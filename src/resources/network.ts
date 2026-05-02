import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Network — outbound networking metadata for the workspace. Currently exposes
 * the platform's egress IP allowlist that customers add to firewall rules
 * before whitelisting integration callbacks.
 */
export class NetworkResource extends WorkspaceScopedResource {
  /** Get the platform's egress IPs the workspace's outbound traffic uses */
  async getEgressIps() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/network/egress-ips', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
