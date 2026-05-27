import { WorkspaceScopedResource, extractData, untypedClient } from './base.js'

type TaskStatus =
  | 'pending'
  | 'dispatched'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
type TaskTier = 'companion' | 'desktop' | 'computer_use'

interface TaskStateResponse {
  cached_tokens?: number
  call_sid: string
  completed_at?: string | null
  dispatched_at?: string | null
  duration_ms?: number | null
  error?: string | null
  error_type?: string | null
  input_tokens?: number
  output_tokens?: number
  progress_message?: string | null
  progress_step?: number | null
  result?: string | null
  skill: string
  status: TaskStatus
  sub_tool_count?: number
  task_id: string
  tier: TaskTier
  workspace_id: string
}

interface TaskListResponse {
  tasks: TaskStateResponse[]
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
      await untypedClient(this.client).GET<TaskStateResponse>(
        '/v1/{workspace_id}/tasks/{task_id}',
        {
          params: { path: { workspace_id: this.workspaceId, task_id: taskId } },
        },
      ),
    )
  }

  /** List every task associated with a call (by Twilio call sid) */
  async listByCall(callSid: string) {
    return extractData(
      await untypedClient(this.client).GET<TaskListResponse>(
        '/v1/{workspace_id}/tasks/by-call/{call_sid}',
        {
          params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
        },
      ),
    )
  }
}
