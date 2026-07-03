import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Framework agent runs — the RUN + CONTEXT edges of the framework-agnostic
 * world-model harness.
 *
 * Launch a message through a framework harness (OpenAI SDK / Anthropic SDK)
 * bound to a service + version set, or a native run from a registered/inline
 * definition; poll it to a terminal status; and fetch the retrievable harness
 * context a run is handed. A run executes the chosen framework unmodified
 * against the platform MCP world-tools edge.
 */
export class AgentRunsResource extends WorkspaceScopedResource {
  /**
   * Launch a framework agent run — a platform run (`service_id` + `framework`)
   * or a native run (`native`). Non-blocking; returns a running `run_id`, poll
   * {@link get}.
   */
  async create(body: components['schemas']['CreateAgentRunRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/agent-runs', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Fetch a run snapshot: status, final text, trajectory, and token usage. */
  async get(runId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/agent-runs/{run_id}', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
      }),
    )
  }

  /**
   * The CONTEXT edge — the retrievable, framework-neutral session bootstrap a
   * service hands an agent: identity/instructions, world scope, tool
   * descriptors, guardrails, the real enforced write-floor, and runtime. This
   * is the exact context a remote framework would fetch before a run.
   */
  async harnessContext(params: { serviceId: string; versionSet?: string }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/agent-runs/harness-context', {
        params: {
          path: { workspace_id: this.workspaceId },
          query: { service_id: params.serviceId, version_set: params.versionSet },
        },
      }),
    )
  }
}
