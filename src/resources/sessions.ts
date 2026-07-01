import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData, untypedClient } from './base.js'

/** Agones fleet selector — live voice calls (default) or the isolated background-tool runners. */
type FleetKind = 'voice' | 'tool-runner'

/**
 * Sessions — operator visibility into **live agent calls**. List the
 * currently active sessions across the workspace, and inject a one-shot
 * directive (text or audio) into a specific call's session mid-flight.
 *
 * Distinct from `client.simulations.sessions` (Playground / batch testing)
 * and `client.simulations.runs.createSession` (sub-session of a multi-run
 * batch). Those are read-write fixtures; this resource controls real,
 * in-progress operator-attended calls.
 *
 * @beta New in this release; surface may evolve.
 */
export class SessionsResource extends WorkspaceScopedResource {
  /** List currently active sessions across the workspace */
  async listActive() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/sessions/active', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /**
   * Live Agones fleet capacity (workspace-global) — Ready/Allocated/total
   * GameServers plus headroom against the maxReplicas ceiling. `fleet`
   * selects the voice fleet (default) or the isolated `tool-runner` fleet;
   * omitted, the server defaults to voice. Operator-only.
   *
   * The `fleet` query param is typed locally until the generated spec picks
   * it up via sdk-sync; the response schema is already generated.
   */
  async getFleetStatus(opts?: { fleet?: FleetKind }) {
    return extractData(
      await untypedClient(this.client).GET<components['schemas']['FleetStatusResponse']>(
        '/v1/{workspace_id}/sessions/fleet-status',
        {
          params: {
            path: { workspace_id: this.workspaceId },
            query: opts?.fleet === undefined ? undefined : { fleet: opts.fleet },
          },
        },
      ),
    )
  }

  /** Inject a one-shot directive (text/audio) into a live call session */
  async inject(callSid: string, body: components['schemas']['InjectRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/sessions/{call_sid}/inject', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
        body,
      }),
    )
  }
}
