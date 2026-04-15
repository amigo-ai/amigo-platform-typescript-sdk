import type {
  SimulationRun,
  SimulationSession,
  CreateSimulationRunRequest,
  CreateSimulationSessionRequest,
  StepSimulationSessionRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { SimulationRunId, SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

/**
 * Run automated simulations to test agent behavior before going live.
 * Simulations support step-by-step interaction and conversation forking.
 */
export class SimulationsResource extends WorkspaceScopedResource {
  // ---- Simulation Runs (batch) ----

  /** Create a new simulation run */
  async createRun(body: CreateSimulationRunRequest): Promise<SimulationRun> {
    return this.fetch<SimulationRun>('/simulations/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List simulation runs */
  async listRuns(params?: ListParams): Promise<PaginatedResponse<SimulationRun>> {
    return this.fetch<PaginatedResponse<SimulationRun>>(`/simulations/runs${buildQuery(params)}`)
  }

  // ---- Interactive Sessions ----

  /** Start an interactive simulation session with an agent */
  async createSession(body: CreateSimulationSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** Get a simulation session */
  async getSession(sessionId: SimulationSessionId | string): Promise<SimulationSession> {
    return this.fetch<SimulationSession>(`/simulations/sessions/${sessionId}`)
  }

  /** Delete a simulation session */
  async deleteSession(sessionId: SimulationSessionId | string): Promise<void> {
    return this.fetch<void>(`/simulations/sessions/${sessionId}`, { method: 'DELETE' })
  }

  /** Send a message and advance the simulation session by one step */
  async step(body: StepSimulationSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions/step', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Fork a simulation session from a specific point.
   * Useful for exploring different conversation paths.
   */
  async fork(sessionId: SimulationSessionId | string): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions/fork', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    })
  }
}
