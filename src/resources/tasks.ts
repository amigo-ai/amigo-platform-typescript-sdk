import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Tasks — long-running async jobs the platform spawns (intake processing,
 * tool executions, voice imports). The SDK exposes get-by-id and a
 * by-call lookup for retrieving every task tied to a specific call.
 */
export class TasksResource extends WorkspaceScopedResource {
  /** Get the current state of a single task */
  async get(taskId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/tasks/{task_id}', {
        params: { path: { workspace_id: this.workspaceId, task_id: taskId } },
      }),
    )
  }

  /** List every task associated with a call (by Twilio call sid) */
  async listByCall(callSid: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/tasks/by-call/{call_sid}', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
      }),
    )
  }
}
