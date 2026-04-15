import type {
  SimulationSession,
  SimulationStepResponse,
  CreateSimulationSessionRequest,
  StepSimulationSessionRequest,
} from '../types/api.js'
import type { SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource } from './base.js'

export interface SimulationIntelligence {
  session_id: string
  intelligence: Record<string, unknown>
}

/**
 * Simulations — interactive agent testing via the Playground.
 *
 * Create a session to get the agent's greeting, then step through the
 * conversation turn by turn. Get LLM-generated caller suggestions to
 * guide exploratory testing.
 */
export class SimulationsResource extends WorkspaceScopedResource {
  /** Start a simulation session — returns the agent's greeting and initial snapshot */
  async createSession(body: CreateSimulationSessionRequest): Promise<SimulationSession> {
    return this.fetch<SimulationSession>('/simulations/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** Get the current snapshot of a session */
  async getSession(sessionId: SimulationSessionId | string): Promise<SimulationSession> {
    return this.fetch<SimulationSession>(`/simulations/sessions/${sessionId}`)
  }

  /** Delete a simulation session */
  async deleteSession(sessionId: SimulationSessionId | string): Promise<{ status: string }> {
    return this.fetch<{ status: string }>(`/simulations/sessions/${sessionId}`, { method: 'DELETE' })
  }

  /**
   * Send a caller utterance and advance the session by one turn.
   * Returns the agent's response observation and updated snapshot.
   */
  async step(body: StepSimulationSessionRequest): Promise<SimulationStepResponse> {
    return this.fetch<SimulationStepResponse>('/simulations/sessions/step', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Get LLM-generated caller message suggestions for the current session state.
   * Helps exploratory testing by suggesting realistic next caller turns.
   */
  async recommend(sessionId: SimulationSessionId | string, n?: number): Promise<{ suggestions: string[] }> {
    return this.fetch('/simulations/sessions/recommend', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, n }),
    })
  }

  /** Get AI-generated call intelligence for a completed session */
  async getIntelligence(sessionId: SimulationSessionId | string): Promise<SimulationIntelligence> {
    return this.fetch<SimulationIntelligence>(`/simulations/sessions/${sessionId}/intelligence`)
  }
}
