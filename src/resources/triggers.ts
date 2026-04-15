import type {
  Trigger,
  TriggerRun,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { TriggerId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListTriggersParams extends ListParams {
  is_active?: boolean
  action_id?: string
}

export interface FireTriggerRequest {
  input_overrides?: Record<string, unknown>
}

/**
 * Manage triggers — scheduled and event-driven automation rules.
 *
 * Each trigger binds a cron schedule or event pattern to an action (a skill).
 * When a trigger fires, the action is executed immediately with the configured input.
 */
export class TriggersResource extends WorkspaceScopedResource {
  /** Create a new trigger */
  async create(body: CreateTriggerRequest): Promise<Trigger> {
    return this.fetch<Trigger>('/triggers', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List triggers in the workspace */
  async list(params?: ListTriggersParams): Promise<PaginatedResponse<Trigger>> {
    return this.fetch<PaginatedResponse<Trigger>>(`/triggers${buildQuery(params)}`)
  }

  /** Get a single trigger */
  async get(triggerId: TriggerId | string): Promise<Trigger> {
    return this.fetch<Trigger>(`/triggers/${triggerId}`)
  }

  /** Update a trigger's configuration */
  async update(triggerId: TriggerId | string, body: UpdateTriggerRequest): Promise<Trigger> {
    return this.fetch<Trigger>(`/triggers/${triggerId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete a trigger */
  async delete(triggerId: TriggerId | string): Promise<void> {
    return this.fetch<void>(`/triggers/${triggerId}`, { method: 'DELETE' })
  }

  /** Pause a trigger — stops it from firing on its schedule */
  async pause(triggerId: TriggerId | string): Promise<Trigger> {
    return this.fetch<Trigger>(`/triggers/${triggerId}/pause`, { method: 'POST' })
  }

  /** Resume a paused trigger */
  async resume(triggerId: TriggerId | string): Promise<Trigger> {
    return this.fetch<Trigger>(`/triggers/${triggerId}/resume`, { method: 'POST' })
  }

  /**
   * Fire a trigger immediately, outside its schedule.
   * Useful for testing or one-off executions.
   */
  async fire(triggerId: TriggerId | string, body?: FireTriggerRequest): Promise<TriggerRun> {
    return this.fetch<TriggerRun>(`/triggers/${triggerId}/fire`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /** List recent runs for a trigger */
  async listRuns(triggerId: TriggerId | string, params?: ListParams): Promise<PaginatedResponse<TriggerRun>> {
    return this.fetch<PaginatedResponse<TriggerRun>>(
      `/triggers/${triggerId}/runs${buildQuery(params)}`,
    )
  }
}
