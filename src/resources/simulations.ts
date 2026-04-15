import type {
  SimulationSession,
  CreateSimulationSessionRequest,
  StepSimulationSessionRequest,
} from '../types/api.js'
import type { SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource } from './base.js'

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

/**
 * Simulations — interactive agent testing via the Playground.
 *
 * Step through conversations with an agent turn by turn, fork at any point
 * to explore different paths, and get LLM-generated caller suggestions.
 */
export class SimulationsResource extends WorkspaceScopedResource {
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

  /** Fork a session from its current point to explore a different conversation path */
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
  async getIntelligence(sessionId: SimulationSessionId | string): Promise<SimulationIntelligence> {
    return this.fetch<SimulationIntelligence>(`/simulations/sessions/${sessionId}/intelligence`)
  }

  /** Get turn-by-turn transcript for a session */
  async getTurns(sessionId: SimulationSessionId | string): Promise<SimulationTurn[]> {
    return this.fetch<SimulationTurn[]>(`/simulations/sessions/${sessionId}/turns`)
  }
}
