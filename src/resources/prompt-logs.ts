import type { components, operations } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Query parameters for {@link PromptLogsResource.list}.
 *
 * Sourced from the OpenAPI ``list-prompt-logs`` operation so the SDK always
 * tracks the canonical contract (no hand-maintained shape that can drift
 * from the platform-api).
 */
export type ListPromptLogsParams = NonNullable<
  operations['list-prompt-logs']['parameters']['query']
>

export type PromptLogEntry = components['schemas']['PromptLogEntry']
export type PromptLogListResponse = components['schemas']['PromptLogListResponse']

/**
 * Prompt-log read surface — full LLM input/output (system prompt,
 * conversation history, tool catalog, model, response) per turn for
 * auditing, debugging, and post-hoc trace analysis.
 *
 * Reads the Delta ``world_events`` ledger via Databricks SQL (typical
 * latency 1-5s, 15s ceiling). **Admin or owner role required** —
 * responses can include PHI from prompt history.
 *
 * The canonical filter is ``conversation_id`` (UUID from
 * ``world.entities``) which works across voice / text / sim / scribe
 * modalities. ``call_sid`` remains for legacy callers and external
 * systems holding the SID directly. The two are mutually exclusive.
 *
 * @example
 * ```ts
 * // Cross-modality: filter by conversation entity UUID.
 * const page = await client.promptLogs.list({
 *   conversation_id: '<entity-uuid>',
 *   limit: 50,
 * })
 *
 * // Direct call SID (Twilio CA-SID for voice).
 * const callPage = await client.promptLogs.list({
 *   call_sid: 'CA01a2b3...',
 *   prompt_type: 'engage_user',
 * })
 *
 * // Auto-paged sweep over a workspace's last 7 days
 * for await (const entry of client.promptLogs.listAutoPaging({
 *   prompt_type: 'navigation',
 * })) {
 *   console.log(entry.event_id, entry.state_name, entry.llm_model)
 * }
 * ```
 */
export class PromptLogsResource extends WorkspaceScopedResource {
  /**
   * One page of prompt-log entries, newest-first.
   *
   * When ``params.conversation_id`` is supplied, the response surfaces
   * ``resolved_call_sid`` (the call_sid the lookup mapped to) and
   * ``resolved_conversation_kind`` (``"call"`` for voice/sim/scribe,
   * ``"conversation"`` for text/sms/whatsapp/email) so you can drill
   * into per-call surfaces afterward without re-querying
   * ``world.entities``.
   *
   * When no selectivity-bearing filter is supplied (no conversation_id /
   * call_sid / time range), the query is auto-capped to the last 7 days.
   * The applied window is reported in ``applied_time_window_days``.
   */
  async list(params?: ListPromptLogsParams): Promise<PromptLogListResponse> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/prompt-logs', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /**
   * Auto-paginating async iterator over prompt-log entries. Walks
   * ``next_offset`` until ``has_more`` is false, yielding individual
   * entries. Use this when consuming logs at scale (e.g. nightly
   * backfills) rather than rendering one page in a UI.
   *
   * Bounded by the same per-call hard caps as ``list`` (200 items per
   * page, 10,000 cumulative offset).
   */
  async *listAutoPaging(
    params?: Omit<ListPromptLogsParams, 'offset'>,
  ): AsyncIterableIterator<PromptLogEntry> {
    let offset = 0
    while (true) {
      const page = await this.list({ ...params, offset })
      for (const entry of page.items) {
        yield entry
      }
      if (!page.has_more || page.next_offset == null) {
        return
      }
      // Advance to the offset the server told us to use; guard against a
      // non-advancing token to avoid an infinite loop on a buggy backend.
      if (page.next_offset === offset) {
        return
      }
      offset = page.next_offset
    }
  }
}
