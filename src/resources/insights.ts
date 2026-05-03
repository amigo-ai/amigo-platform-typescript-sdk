import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Insights — natural-language analytics on workspace data.
 *
 * Surfaces the schema browser, suggestion catalog, ad-hoc SQL execution,
 * and chat sessions that reason over call/world data. Used by the
 * developer console's Insights tab.
 *
 * @beta New in this release; surface may evolve.
 *
 * Note: `withOptions(...)` on the parent resource does not propagate into
 * the `sessions` plain-object sub-resource. Apply scoped options at the
 * `client.insights` level only.
 */
export class InsightsResource extends WorkspaceScopedResource {
  /** Get the periodic insights digest for the workspace */
  async getDigest() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/insights/digest', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Fetch the queryable schema (tables, columns, joins) the assistant uses */
  async getSchema() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/insights/schema', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get curated query suggestions for the workspace */
  async getSuggestions() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/insights/suggestions', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Run an ad-hoc SQL query against the insights warehouse */
  async runSql(body: components['schemas']['SqlQueryRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/insights/sql', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  readonly sessions = {
    /** Start a new insights chat session */
    create: async () =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/insights/sessions', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),

    /** Get a session and its full history */
    get: async (sessionId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/insights/sessions/{session_id}', {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
        }),
      ),

    /** Send a chat message and get the assistant's response (with any generated SQL/results) */
    chat: async (sessionId: string, body: components['schemas']['ChatRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/insights/sessions/{session_id}/chat', {
          params: { path: { workspace_id: this.workspaceId, session_id: sessionId } },
          body,
        }),
      ),
  }
}
