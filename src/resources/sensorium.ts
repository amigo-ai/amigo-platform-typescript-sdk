import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Sensorium — operator-facing observability for the live agent loop.
 *
 * Surfaces connector health (per-integration up/down + latency) and
 * end-to-end loop latency (turn ingest → response) for diagnosing
 * production regressions in real time.
 *
 * @beta New in this release; surface may evolve.
 */
export class SensoriumResource extends WorkspaceScopedResource {
  /** Per-connector health snapshot (status + latency) */
  async getConnectorHealth() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/sensorium/connector-health', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** End-to-end agent loop latency breakdown (per-stage timings) */
  async getLoopLatency() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/sensorium/loop-latency', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
