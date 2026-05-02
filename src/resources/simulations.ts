import type { components } from '../generated/api.js'
import type { ServiceId, SimulationRunId, SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListSimulationRunsParams extends ListParams {
  service_id?: string
  status?: string
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

  /**
   * Multi-session simulation runs — orchestrate a batch of scenarios against
   * a service to compute coverage and surface regressions. Use this when you
   * want to compare branch behavior or measure drift between versions.
   */
  readonly runs = {
    /** List simulation runs in the workspace */
    list: async (params?: ListSimulationRunsParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/simulations/runs', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** Create a new simulation run */
    create: async (body: components['schemas']['CreateRunRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/runs', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),

    /** Get a simulation run with its scenarios + status */
    get: async (runId: SimulationRunId | string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/simulations/runs/{run_id}', {
          params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        }),
      ),

    /** Mark a run as complete (used by the harness once all sessions finish) */
    complete: async (runId: SimulationRunId | string) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/runs/{run_id}/complete', {
          params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        }),
      ),

    /** Spin up a session under a run (single scenario inside the run's batch) */
    createSession: async (
      runId: SimulationRunId | string,
      body: components['schemas']['src__routes__simulations__CreateSessionRequest'],
    ) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/runs/{run_id}/sessions', {
          params: { path: { workspace_id: this.workspaceId, run_id: runId } },
          body,
        }),
      ),
  }

  /**
   * Bridge — convert recorded production calls into simulation scenarios so
   * they can be replayed against a candidate version. ``plan`` returns a
   * preview of which calls would be selected; ``run`` executes the plan.
   */
  readonly bridge = {
    /** Plan a bridge run — returns the candidate scenarios without executing */
    plan: async (body: components['schemas']['BridgePlanRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/bridge/plan', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),

    /** Execute a bridge run and return the resulting run handle */
    run: async (body: components['schemas']['BridgeRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/bridge', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  /**
   * Per-service simulation views — graph of explored conversation paths,
   * recorded sessions, and per-turn telemetry. Used by the developer console's
   * coverage tab to visualize what scenarios have been exercised.
   */
  readonly services = {
    /** Get the conversation graph (nodes/edges) for a service */
    getGraph: async (serviceId: ServiceId | string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/simulations/services/{service_id}/graph', {
          params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
        }),
      ),

    /** Reset / delete the service's accumulated graph */
    deleteGraph: async (serviceId: ServiceId | string) =>
      extractData(
        await this.client.DELETE('/v1/{workspace_id}/simulations/services/{service_id}/graph', {
          params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
        }),
      ),

    /** Get the set of explored conversation paths through the graph */
    getGraphPaths: async (serviceId: ServiceId | string) =>
      extractData(
        await this.client.GET(
          '/v1/{workspace_id}/simulations/services/{service_id}/graph/paths',
          {
            params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
          },
        ),
      ),

    /** List recorded sessions for the service */
    listSessions: async (serviceId: ServiceId | string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/simulations/services/{service_id}/sessions', {
          params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
        }),
      ),

    /** List per-turn observations for the service */
    listTurns: async (serviceId: ServiceId | string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/simulations/services/{service_id}/turns', {
          params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
        }),
      ),
  }
}
