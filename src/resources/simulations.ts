import type { components } from '../generated/api.js'
import type { SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Simulations — interactive agent testing via the Playground.
 *
 * Create a session to get the agent's greeting, then step through the
 * conversation turn by turn. Get LLM-generated caller suggestions to
 * guide exploratory testing.
 */
export class SimulationsResource extends WorkspaceScopedResource {
  /** Start a simulation session — returns the agent's greeting and initial snapshot */
  async createSession(
    body: components['schemas']['src__routes__simulations__CreateSessionRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Get the current snapshot of a session */
  async getSession(sessionId: SimulationSessionId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/simulations/sessions/{session_id}', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }

  /** Delete a simulation session */
  async deleteSession(sessionId: SimulationSessionId | string) {
    return extractData(
      await this.client.DELETE('/v1/{workspace_id}/simulations/sessions/{session_id}', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }

  /**
   * Send a caller utterance and advance the session by one turn.
   * Returns the agent's response observation and updated snapshot.
   */
  async step(body: components['schemas']['StepRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions/step', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /**
   * Get LLM-generated caller message suggestions for the current session state.
   * Helps exploratory testing by suggesting realistic next caller turns.
   */
  async recommend(body: components['schemas']['RecommendRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions/recommend', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Get AI-generated call intelligence for a completed session */
  async getIntelligence(sessionId: SimulationSessionId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/simulations/sessions/{session_id}/intelligence', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }
}
