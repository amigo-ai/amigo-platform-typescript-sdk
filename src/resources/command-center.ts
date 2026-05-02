import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Command Center — single rolled-up snapshot used to drive the developer
 * console's homepage tiles (active calls, queue depth, alerting status,
 * recent escalations, etc.). One endpoint, refreshed on demand.
 */
export class CommandCenterResource extends WorkspaceScopedResource {
  /** Get the current command-center snapshot */
  async get() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/command-center', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
