import type { components } from '../generated/api.js'
import type { ListParams } from '../core/utils.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export interface ListAgentDefinitionsParams extends ListParams {
  /** Filter to a single native framework. */
  framework?: components['schemas']['AgentDefinitionSummary']['framework']
  /** Include archived definitions (default: active only). */
  include_archived?: boolean
}

/**
 * Native (bring-your-own) agent definition registry — the frameworks layer's
 * registry for native framework agents (OpenAI SDK / Anthropic SDK) that run
 * against the platform world-model tools. Register is an idempotent push: a new
 * content hash mints a new immutable, clamp-validated version.
 */
export class AgentDefinitionsResource extends WorkspaceScopedResource {
  async list(params?: ListAgentDefinitionsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/agent-definitions', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListAgentDefinitionsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /**
   * Register (idempotent push) a native definition. An identical body re-push
   * reports `created: false`; a changed body mints a new version.
   */
  async register(body: components['schemas']['RegisterAgentDefinitionRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/agent-definitions', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Dry-run clamp validation — nothing is stored; 422 with the offending paths on failure. */
  async validate(body: components['schemas']['RegisterAgentDefinitionRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/agent-definitions/validate', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async get(definitionId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/agent-definitions/{definition_id}', {
        params: {
          path: { workspace_id: this.workspaceId, definition_id: definitionId },
        },
      }),
    )
  }

  /** Fetch a specific immutable version, including its clamped body. */
  async getVersion(definitionId: string, version: number) {
    return extractData(
      await this.client.GET(
        '/v1/{workspace_id}/agent-definitions/{definition_id}/versions/{version}',
        {
          params: {
            path: {
              workspace_id: this.workspaceId,
              definition_id: definitionId,
              version,
            },
          },
        },
      ),
    )
  }

  async archive(definitionId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/agent-definitions/{definition_id}', {
      params: {
        path: { workspace_id: this.workspaceId, definition_id: definitionId },
      },
    })
  }
}
