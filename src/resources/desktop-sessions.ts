import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Internal alias over the platform-keyed schema name
 * `src__routes__desktop_sessions__CreateSessionRequest`. The Python-module
 * prefix is unstable — once the platform team adds a `title=` annotation
 * the key disappears and the build fails (the safety net we actually rely
 * on). Marked `@internal` so consumers don't import it by name and get
 * burned by the upstream rename.
 *
 * @internal
 */
export type CreateDesktopSessionRequest =
  components['schemas']['src__routes__desktop_sessions__CreateSessionRequest']

/**
 * Desktop sessions — remote-controlled desktop instances the agent can use
 * to drive third-party apps (EHRs, CRMs) that lack APIs. Created on demand
 * and torn down when the agent finishes the workflow.
 *
 * @beta New in this release; surface may evolve.
 */
export class DesktopSessionsResource extends WorkspaceScopedResource {
  /** Spin up a new desktop session */
  async create(body: CreateDesktopSessionRequest) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/desktop-sessions', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Disconnect / tear down a desktop session */
  async disconnect(sessionId: string) {
    return extractData(
      await this.client.DELETE('/v1/{workspace_id}/desktop-sessions/{session_id}', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }

  /** Drive a click / type / scroll action against the session */
  async sendAction(sessionId: string, body: components['schemas']['ActionRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/desktop-sessions/{session_id}/action', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        body,
      }),
    )
  }

  /** Get the latest screenshot for a session */
  async getScreenshot(sessionId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/desktop-sessions/{session_id}/screenshot', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }

  /** Get the session's current connection + activity status */
  async getStatus(sessionId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/desktop-sessions/{session_id}/status', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }
}
