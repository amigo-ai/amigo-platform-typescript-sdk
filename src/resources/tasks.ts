import type { PlatformFetch } from '../core/openapi-client.js'
import { WorkspaceScopedResource, extractData } from './base.js'

interface UntypedOpenApiResult<T> {
  data?: T
  error?: unknown
  response?: Response
}

interface UntypedOpenApiClient {
  GET<T>(path: string, init: object): Promise<UntypedOpenApiResult<T>>
}

function untypedClient(client: PlatformFetch): UntypedOpenApiClient {
  return client as unknown as UntypedOpenApiClient
}

/**
 * Tasks — long-running async jobs the platform spawns (intake processing,
 * tool executions, voice imports). The SDK exposes get-by-id and a
 * by-call lookup for retrieving every task tied to a specific call.
 *
 * @beta New in this release; surface may evolve.
 */
export class TasksResource extends WorkspaceScopedResource {
  /** Get the current state of a single task */
  async get(taskId: string) {
    return extractData(
      await untypedClient(this.client).GET('/v1/{workspace_id}/tasks/{task_id}', {
        params: { path: { workspace_id: this.workspaceId, task_id: taskId } },
      }),
    )
  }

  /** List every task associated with a call (by Twilio call sid) */
  async listByCall(callSid: string) {
    return extractData(
      await untypedClient(this.client).GET('/v1/{workspace_id}/tasks/by-call/{call_sid}', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
      }),
    )
  }
}
