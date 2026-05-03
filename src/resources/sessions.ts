import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Sessions — operator visibility into live agent calls. List the currently
 * active sessions across the workspace, and inject a one-shot directive
 * (text or audio) into a specific call's session mid-flight.
 *
 * @beta New in this release; surface may evolve.
 */
export class SessionsResource extends WorkspaceScopedResource {
  /** List currently active sessions across the workspace */
  async listActive() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/sessions/active', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Inject a one-shot directive (text/audio) into a live call session */
  async inject(callSid: string, body: components['schemas']['InjectRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/sessions/{call_sid}/inject', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
        body,
      }),
    )
  }
}
