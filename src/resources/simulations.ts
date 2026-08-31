import type { components, paths } from '../generated/api.js'
import type { ServiceId, SimulationRunId, SimulationSessionId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'

type CreateSimulationSessionRequest = components['schemas']['CreateSessionRequest']

export type ListSimulationRunsParams = NonNullable<
  paths['/v1/{workspace_id}/simulations/runs']['get']['parameters']['query']
>

/**
 * Simulations — interactive agent testing via the Playground.
 *
 * Create a session to get the agent's greeting, then step through the
 * conversation turn by turn. Get LLM-generated caller suggestions to
 * guide exploratory testing.
 */
export class SimulationsResource extends WorkspaceScopedResource {
  /** Start a simulation session — returns the agent's greeting and initial snapshot */
  async createSession(body: CreateSimulationSessionRequest) {
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
   * Fork a session into N branches — clone the session at its current turn and
   * step each alternative caller utterance atomically. The session must belong
   * to a coverage run (branches attribute to the parent's `run_id`); forking a
   * run-less session is rejected server-side. `session_id` travels in the path,
   * so `body` carries only the alternatives.
   */
  async forkSession(
    sessionId: SimulationSessionId | string,
    body: components['schemas']['ForkRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions/{session_id}/fork', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        body,
      }),
    )
  }

  /** Assign a score (and optional rationale) to a completed simulation session. */
  async scoreSession(
    sessionId: SimulationSessionId | string,
    body: components['schemas']['ScoreSessionRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions/{session_id}/score', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        body,
      }),
    )
  }

  /**
   * Promote a run-less (interactive playground) session into a coverage run so
   * it can be forked/scored. Creates a run, binds the session to it, and writes
   * the coverage session record. Idempotent: a session that already belongs to
   * a run returns that run with `already_bound: true`. No request body —
   * `session_id` travels in the path.
   */
  async promoteSession(sessionId: SimulationSessionId | string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/simulations/sessions/{session_id}/promote', {
        params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
      }),
    )
  }

  /**
   * Multi-session simulation runs — orchestrate a batch of scenarios against
   * a service to compute coverage and surface regressions. Use this when you
   * want to compare branch behavior or measure drift between versions.
   *
   * @beta New in this release; surface may evolve.
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
    createSession: async (runId: SimulationRunId | string, body: CreateSimulationSessionRequest) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/simulations/runs/{run_id}/sessions', {
          params: { path: { workspace_id: this.workspaceId, run_id: runId } },
          body,
        }),
      ),
  }

  /**
   * Bridge — convert recorded production calls into simulation scenarios so
   * they can be replayed against a candidate version.
   */
  readonly bridge = {
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
        await this.client.GET('/v1/{workspace_id}/simulations/services/{service_id}/graph/paths', {
          params: { path: { workspace_id: this.workspaceId, service_id: serviceId } },
        }),
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
