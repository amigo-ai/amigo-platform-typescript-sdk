import type {
  SimulationRun,
  SimulationSession,
  CreateSimulationRunRequest,
  CreateSimulationSessionRequest,
  StepSimulationSessionRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { SimulationRunId, SimulationSessionId, ServiceId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface SimulationTurn {
  index: number
  role: 'user' | 'agent'
  content: string
  tool_calls: Array<{ name: string; input: Record<string, unknown>; output: unknown }> | null
  created_at: string
}

export interface SimulationIntelligence {
  summary: string | null
  sentiment: string | null
  key_moments: Array<{ type: string; description: string; turn_index: number }>
  outcomes: string[]
}

export interface CoverageGraph {
  service_id: string
  nodes: Array<{ state: string; visit_count: number }>
  edges: Array<{ from: string; to: string; transition: string; count: number }>
  coverage_pct: number
}

export interface CoverageGraphPath {
  path: string[]
  transitions: string[]
  session_count: number
}

export interface ScoreSessionRequest {
  session_id: string
  scores: Record<string, number>
  notes?: string
}

export interface CreateCoverageSessionRequest {
  run_id: SimulationRunId | string
  path?: string[]
  initial_state?: string
}

/**
 * Simulations — interactive agent testing and automated coverage tracking.
 *
 * Interactive sessions let you step through conversations with an agent
 * turn by turn. Coverage runs track which states of a context graph
 * have been exercised across a batch of test sessions.
 */
export class SimulationsResource extends WorkspaceScopedResource {
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

  /** Send a message and advance the session by one step */
  async step(body: StepSimulationSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions/step', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Fork a session from its current point to explore a different path.
   */
  async fork(sessionId: SimulationSessionId | string): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions/fork', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    })
  }

  /**
   * Get LLM-generated caller message suggestions for the current session state.
   * Helps exploratory testing by suggesting realistic next user turns.
   */
  async recommend(sessionId: SimulationSessionId | string): Promise<{ suggestions: string[] }> {
    return this.fetch('/simulations/sessions/recommend', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    })
  }

  /** Get AI-generated call intelligence for a completed session */
  async getSessionIntelligence(sessionId: SimulationSessionId | string): Promise<SimulationIntelligence> {
    return this.fetch<SimulationIntelligence>(`/simulations/sessions/${sessionId}/intelligence`)
  }

  /** Get turn-by-turn transcript for a session */
  async getSessionTurns(sessionId: SimulationSessionId | string): Promise<SimulationTurn[]> {
    return this.fetch<SimulationTurn[]>(`/simulations/sessions/${sessionId}/turns`)
  }

  /** Score a completed session (for evaluation and coverage tracking) */
  async scoreSession(body: ScoreSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions/score', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ---- Coverage Runs ----

  /** Create a new coverage run against a context graph */
  async createRun(body: CreateSimulationRunRequest): Promise<SimulationRun> {
    return this.fetch<SimulationRun>('/simulations/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List coverage runs */
  async listRuns(params?: ListParams): Promise<PaginatedResponse<SimulationRun>> {
    return this.fetch<PaginatedResponse<SimulationRun>>(`/simulations/runs${buildQuery(params)}`)
  }

  /** Mark a coverage run as complete */
  async completeRun(runId: SimulationRunId | string): Promise<SimulationRun> {
    return this.fetch<SimulationRun>(`/simulations/runs/${runId}/complete`, { method: 'POST' })
  }

  /** Create a session within a coverage run */
  async createCoverageSession(body: CreateCoverageSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>(`/simulations/runs/${body.run_id}/sessions`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ---- Coverage Graph (per service) ----

  /** Get the coverage graph for a service's context graph */
  async getCoverageGraph(serviceId: ServiceId | string): Promise<CoverageGraph> {
    return this.fetch<CoverageGraph>(`/simulations/services/${serviceId}/graph`)
  }

  /** Get distinct paths exercised through a service's context graph */
  async getCoverageGraphPaths(serviceId: ServiceId | string): Promise<CoverageGraphPath[]> {
    return this.fetch<CoverageGraphPath[]>(`/simulations/services/${serviceId}/graph/paths`)
  }

  /** List sessions for a service's coverage graph */
  async listServiceSessions(
    serviceId: ServiceId | string,
    params?: ListParams,
  ): Promise<PaginatedResponse<SimulationSession>> {
    return this.fetch<PaginatedResponse<SimulationSession>>(
      `/simulations/services/${serviceId}/sessions${buildQuery(params)}`,
    )
  }

  /** Delete all coverage data for a service */
  async deleteCoverageGraph(serviceId: ServiceId | string): Promise<void> {
    return this.fetch<void>(`/simulations/services/${serviceId}/graph`, { method: 'DELETE' })
  }
}
