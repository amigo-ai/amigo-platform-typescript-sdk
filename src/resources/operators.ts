import type {
  Operator,
  CreateOperatorRequest,
  UpdateOperatorRequest,
  OperatorDashboard,
  PaginatedResponse,
} from '../types/api.js'
import type { OperatorId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

/**
 * Manage operators — human agents who can monitor calls and join live sessions.
 */
export class OperatorsResource extends WorkspaceScopedResource {
  /** Create a new operator */
  async create(body: CreateOperatorRequest): Promise<Operator> {
    return this.fetch<Operator>('/operators', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List operators */
  async list(params?: ListParams): Promise<PaginatedResponse<Operator>> {
    return this.fetch<PaginatedResponse<Operator>>(`/operators${buildQuery(params)}`)
  }

  /** Get a single operator */
  async get(operatorId: OperatorId | string): Promise<Operator> {
    return this.fetch<Operator>(`/operators/${operatorId}`)
  }

  /** Update an operator */
  async update(operatorId: OperatorId | string, body: UpdateOperatorRequest): Promise<Operator> {
    return this.fetch<Operator>(`/operators/${operatorId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Delete an operator */
  async delete(operatorId: OperatorId | string): Promise<void> {
    return this.fetch<void>(`/operators/${operatorId}`, { method: 'DELETE' })
  }

  /** Get real-time dashboard metrics (queue depth, active calls, wait times) */
  async getDashboard(): Promise<OperatorDashboard> {
    return this.fetch<OperatorDashboard>('/operators/dashboard')
  }

  /** Join a live call as a listener or participant */
  async joinCall(operatorId: OperatorId | string, callId: string): Promise<{ join_url: string }> {
    return this.fetch<{ join_url: string }>(`/operators/${operatorId}/join-call`, {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    })
  }
}
