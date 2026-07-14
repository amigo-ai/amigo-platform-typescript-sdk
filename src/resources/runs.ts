import type { components, operations } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type Run = components['schemas']['Run']
export type RunsResponse = components['schemas']['RunsResponse']
export type RunsSummaryResponse = components['schemas']['RunsSummaryResponse']

type ListRunsQuery = NonNullable<
  operations['list_runs_v1__workspace_id__runs_get']['parameters']['query']
>
type SummarizeRunsQuery = NonNullable<
  operations['runs_summary_v1__workspace_id__runs_summary_get']['parameters']['query']
>

export interface ListRunsParams {
  limit?: ListRunsQuery['limit']
  continuationToken?: ListRunsQuery['continuation_token']
  kind?: ListRunsQuery['kind']
  channel?: ListRunsQuery['channel']
  status?: ListRunsQuery['status']
  sortBy?: ListRunsQuery['sort_by']
}

export interface SummarizeRunsParams {
  kind?: SummarizeRunsQuery['kind']
  channel?: SummarizeRunsQuery['channel']
}

/**
 * Unified runs — the channel-neutral run backbone.
 *
 * Every agent trajectory is a Run: a conversation run (voice / text / sms /
 * email / web, from Lakebase `world.conversations`) OR a framework run
 * (claude-agent-sdk / openai-agents, from the Delta `world.runs` MV), federated
 * behind one `Run` contract. This resource is the SDK surface for that backbone:
 * list + summary + single-run detail + framework trajectory (reads), plus the
 * run-scoped operator verbs (guidance / takeover / handback / switch-mode /
 * access-token) addressed by the channel-neutral `run_id`.
 *
 * Distinct from {@link AgentRunsResource} (`/agent-runs`, framework execution)
 * and the conversation surface (`/conversations`, create/detail/turns): only
 * this resource lists every run kind and speaks the unified `run_id`.
 */
export class RunsResource extends WorkspaceScopedResource {
  /**
   * Paginated, newest-first list of runs. `kind` / `channel` / `status` are
   * multi-value OR-filters (repeat within an axis, AND across axes); `status`
   * accepts the virtual `live` (running + paused). `continuationToken` is the
   * opaque cursor from a prior page — round-trip it verbatim.
   */
  async list(params?: ListRunsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/runs', {
        params: {
          path: { workspace_id: this.workspaceId },
          query: {
            limit: params?.limit,
            continuation_token: params?.continuationToken,
            kind: params?.kind,
            channel: params?.channel,
            status: params?.status,
            sort_by: params?.sortBy,
          },
        },
      }),
    )
  }

  /** Aggregate run counts (total / live / by-status / by-kind). */
  async summary(params?: SummarizeRunsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/runs/summary', {
        params: {
          path: { workspace_id: this.workspaceId },
          query: { kind: params?.kind, channel: params?.channel },
        },
      }),
    )
  }

  /** Resolve one run by its channel-neutral `run_id`, at any status. */
  async get(runId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/runs/{run_id}', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
      }),
    )
  }

  /**
   * The ordered structural steps of a FRAMEWORK run's trajectory (perception /
   * decision / tool / completion). 409 for conversation runs (they have per-turn
   * detail via the conversation surface).
   */
  async trajectory(runId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/runs/{run_id}/trajectory', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
      }),
    )
  }

  /** Send operator guidance to a LIVE run (the agent folds it into its next turn). */
  async sendGuidance(runId: string, body: components['schemas']['RunGuidanceRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/runs/{run_id}/guidance', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        body,
      }),
    )
  }

  /** Take a live run over (operator drives). Returns the audio-leg coordinates for voice. */
  async takeOver(runId: string, body: components['schemas']['RunTakeoverRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/runs/{run_id}/takeover', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        body,
      }),
    )
  }

  /** Hand a taken-over run back to the agent. */
  async handBack(runId: string, body: components['schemas']['RunHandbackRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/runs/{run_id}/handback', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        body,
      }),
    )
  }

  /** Switch the operator's mode on a live run (listen ↔ takeover). */
  async switchMode(runId: string, body: components['schemas']['RunSwitchModeRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/runs/{run_id}/switch-mode', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        body,
      }),
    )
  }

  /** Mint a run-scoped browser access token (voice takeover audio leg). */
  async accessToken(runId: string, body: components['schemas']['RunAccessTokenRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/runs/{run_id}/access-token', {
        params: { path: { workspace_id: this.workspaceId, run_id: runId } },
        body,
      }),
    )
  }
}
