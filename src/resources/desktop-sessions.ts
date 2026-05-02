import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Desktop sessions — remote-controlled desktop instances the agent can use
 * to drive third-party apps (EHRs, CRMs) that lack APIs. Created on demand
 * and torn down when the agent finishes the workflow.
 */
export class DesktopSessionsResource extends WorkspaceScopedResource {
  /** Spin up a new desktop session */
  async create(
    body: components['schemas']['src__routes__desktop_sessions__CreateSessionRequest'],
  ) {
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
