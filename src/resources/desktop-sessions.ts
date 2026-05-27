import type { PlatformFetch } from '../core/openapi-client.js'
import { WorkspaceScopedResource, extractData } from './base.js'

interface UntypedOpenApiResult<T> {
  data?: T
  error?: unknown
  response?: Response
}

interface UntypedOpenApiClient {
  GET<T>(path: string, init: object): Promise<UntypedOpenApiResult<T>>
  POST<T>(path: string, init: object): Promise<UntypedOpenApiResult<T>>
  DELETE<T>(path: string, init: object): Promise<UntypedOpenApiResult<T>>
}

interface CreateDesktopSessionRequest {
  integration_name: string
}

type DesktopActionKind =
  | 'click'
  | 'double_click'
  | 'type'
  | 'key'
  | 'scroll'
  | 'move'
  | 'drag'
  | 'clipboard_type'

interface DesktopActionRequest {
  amount?: number | null
  button?: string | null
  direction?: 'up' | 'down' | 'left' | 'right' | null
  key?: string | null
  text?: string | null
  type: DesktopActionKind
  x?: number | null
  x1?: number | null
  x2?: number | null
  y?: number | null
  y1?: number | null
  y2?: number | null
}

interface DesktopSessionResponse {
  connected: boolean
  display_size: number[]
  session_id: string
}

interface DesktopActionResponse {
  ok: boolean
}

interface DesktopDisconnectResponse {
  ok: boolean
}

interface DesktopScreenshotResponse {
  [key: string]: unknown
}

interface DesktopSessionStatusResponse {
  connected: boolean
  created_at: number
  healthy: boolean
  idle_seconds: number
  session_id: string
}

function untypedClient(client: PlatformFetch): UntypedOpenApiClient {
  return client as unknown as UntypedOpenApiClient
}

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
      await untypedClient(this.client).POST<DesktopSessionResponse>(
        '/v1/{workspace_id}/desktop-sessions',
        {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        },
      ),
    )
  }

  /** Disconnect / tear down a desktop session */
  async disconnect(sessionId: string) {
    return extractData(
      await untypedClient(this.client).DELETE<DesktopDisconnectResponse>(
        '/v1/{workspace_id}/desktop-sessions/{session_id}',
        {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        },
      ),
    )
  }

  /** Drive a click / type / scroll action against the session */
  async sendAction(sessionId: string, body: DesktopActionRequest) {
    return extractData(
      await untypedClient(this.client).POST<DesktopActionResponse>(
        '/v1/{workspace_id}/desktop-sessions/{session_id}/action',
        {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
          body,
        },
      ),
    )
  }

  /** Get the latest screenshot for a session */
  async getScreenshot(sessionId: string) {
    return extractData(
      await untypedClient(this.client).GET<DesktopScreenshotResponse>(
        '/v1/{workspace_id}/desktop-sessions/{session_id}/screenshot',
        {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        },
      ),
    )
  }

  /** Get the session's current connection + activity status */
  async getStatus(sessionId: string) {
    return extractData(
      await untypedClient(this.client).GET<DesktopSessionStatusResponse>(
        '/v1/{workspace_id}/desktop-sessions/{session_id}/status',
        {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        },
      ),
    )
  }
}
