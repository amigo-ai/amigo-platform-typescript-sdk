import type { paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export type ListPipelineSourcesParams = NonNullable<
  paths['/v1/{workspace_id}/pipeline/sources']['get']['parameters']['query']
>

/**
 * Pipeline — observability into the workspace's data ingestion pipeline:
 * source health, throughput, entity resolution metrics, review backlog,
 * outbound deliveries, and per-source overviews / event histories.
 *
 * @beta New in this release; surface may evolve.
 *
 * Note: `withOptions(...)` on the parent resource does not propagate into
 * the `outbound` and `sources` plain-object sub-resources. Apply scoped
 * options at the `client.pipeline` level only.
 */
export class PipelineResource extends WorkspaceScopedResource {
  /** Overall pipeline status (sources up/down, last successful run, etc.) */
  async getStatus() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/pipeline/status', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Throughput buckets over the recent window */
  async getThroughput() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/pipeline/throughput', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Review backlog metrics (pending merges, pending escalations) */
  async getReview() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/pipeline/review', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Entity resolution metrics (merge rate, candidate rate, false-positive rate) */
  async getEntityResolution() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/pipeline/entity-resolution', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  readonly outbound = {
    /** List recent outbound deliveries */
    list: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/pipeline/outbound', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),

    /** Get the delivery log for a specific outbound data source */
    getLog: async (dataSourceId: string, params?: ListParams) =>
      extractData(
        await this.client.GET(
          '/v1/{workspace_id}/pipeline/outbound/{data_source_id}/log',
          {
            params: {
              path: { workspace_id: this.workspaceId, data_source_id: dataSourceId },
              query: params,
            },
          },
        ),
      ),
  }

  readonly sources = {
    /** List all configured pipeline sources */
    list: async (params?: ListPipelineSourcesParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/pipeline/sources', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** Get a per-source overview (last sync, error counts, deltas) */
    getOverview: async (sourceId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/pipeline/sources/{source_id}/overview', {
          params: { path: { workspace_id: this.workspaceId, source_id: sourceId } },
        }),
      ),

    /** Stream the source's recent events */
    listEvents: async (sourceId: string, params?: ListParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/pipeline/sources/{source_id}/events', {
          params: {
            path: { workspace_id: this.workspaceId, source_id: sourceId },
            query: params,
          },
        }),
      ),

    /** Per-source historical timeline */
    getHistory: async (sourceId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/pipeline/sources/{source_id}/history', {
          params: { path: { workspace_id: this.workspaceId, source_id: sourceId } },
        }),
      ),
  }
}
