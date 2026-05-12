import type { components, operations } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type ConversationDetail = components['schemas']['ConversationDetail']
export type ConversationListResponse = components['schemas']['ConversationListResponse']
export type ConversationSummary =
  components['schemas']['src__routes__conversations__ConversationSummary']
export type ConversationTurn = components['schemas']['ConversationTurn']
export type CreateConversationRequest = components['schemas']['CreateConversationRequest']
export type TurnRequest = components['schemas']['TurnRequest']
export type TurnResponse = components['schemas']['TurnResponse']

export type ListConversationsParams = NonNullable<
  operations['list_conversations_v1__workspace_id__conversations_get']['parameters']['query']
>

/** Access JSON text conversation APIs. */
export class ConversationsResource extends WorkspaceScopedResource {
  async list(params?: ListConversationsParams): Promise<ConversationListResponse> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/conversations', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async create(request: CreateConversationRequest): Promise<ConversationDetail> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/conversations', {
        params: { path: { workspace_id: this.workspaceId } },
        body: request,
      }),
    )
  }

  async get(conversationId: string): Promise<ConversationDetail> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/conversations/{conversation_id}', {
        params: {
          path: { workspace_id: this.workspaceId, conversation_id: conversationId },
        },
      }),
    )
  }

  async close(conversationId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/conversations/{conversation_id}', {
      params: {
        path: { workspace_id: this.workspaceId, conversation_id: conversationId },
      },
    })
  }

  /**
   * Send a user message and receive the agent's synchronous JSON response.
   *
   * Pass `options.includeToolCalls: true` to request tool-call metadata
   * alongside the response turns. Server-side default is `false` — without
   * this opt-in the `tool_calls` array on the `TurnResponse` will be empty
   * even when the agent invoked tools during the turn.
   */
  async createTurn(
    conversationId: string,
    request: TurnRequest,
    options?: { includeToolCalls?: boolean },
  ): Promise<TurnResponse> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/conversations/{conversation_id}/turns', {
        params: {
          path: { workspace_id: this.workspaceId, conversation_id: conversationId },
          ...(options?.includeToolCalls !== undefined && {
            query: { include_tool_calls: options.includeToolCalls },
          }),
        },
        body: request,
        headers: { Accept: 'application/json' },
      }),
    ) as TurnResponse
  }
}
