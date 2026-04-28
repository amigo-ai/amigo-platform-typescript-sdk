import { ConfigurationError } from '../core/errors.js'
import { type PlatformFetch } from '../core/openapi-client.js'
import type { ScopedRequestOptions } from '../core/request-options.js'
import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData, scopePlatformClient } from './base.js'

export type ConversationMessage = components['schemas']['ConversationMessage']
export type SendMessageRequest = components['schemas']['SendMessageRequest']
export type SendMessageResponse = components['schemas']['SendMessageResponse']

// Hand-authored because the text-stream WebSocket endpoint is intentionally
// outside the generated OpenAPI REST snapshot.
export interface TextStreamUrlParams {
  serviceId: string
  conversationId?: string
  entityId?: string
  /**
   * Bearer token query-param fallback for clients whose API key cannot be sent
   * as a WebSocket subprotocol token. Prefer textStreamAuthProtocols() when
   * the token is subprotocol-safe so secrets do not appear in URLs.
   */
  token?: string
  /**
   * Full text-stream URL override for preview/custom ingress.
   * Defaults to `${baseUrl origin}/voice-agent/agent/text-stream` with
   * `http` mapped to `ws` and `https` mapped to `wss`.
   */
  textStreamUrl?: string
}

export type TextStreamAuthProtocols = readonly ['auth', string]

const MAX_AUTH_TOKEN_CHARS = 4096
const TEXT_STREAM_AUTH_TOKEN_RE = /^[A-Za-z0-9._+=/:-]+$/
const WEB_SOCKET_PROTOCOL_TOKEN_RE = /^[!#$%&'*+\-.^_`|~A-Za-z0-9]+$/

/** Access text conversation APIs and text-stream URL helpers. */
export class ConversationsResource extends WorkspaceScopedResource {
  constructor(
    client: PlatformFetch,
    workspaceId: string,
    private readonly baseUrl: string,
  ) {
    super(client, workspaceId)
  }

  override withOptions(options: ScopedRequestOptions): this {
    // Conversations also needs the configured REST base URL to derive the
    // agent-engine WebSocket URL, so preserve it when cloning scoped clients.
    return new ConversationsResource(
      scopePlatformClient(this.client, options),
      this.workspaceId,
      this.baseUrl,
    ) as this
  }

  /** Send one user-first text message and receive synchronous agent responses. */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/conversations/messages', {
        params: { path: { workspace_id: this.workspaceId } },
        body: request,
      }),
    )
  }

  /** Build the real-time text WebSocket URL for browser or custom clients. */
  textStreamUrl(params: TextStreamUrlParams): string {
    const url = buildTextStreamUrl({
      baseUrl: this.baseUrl,
      workspaceId: this.workspaceId,
      ...params,
    })
    return url.toString()
  }
}

/**
 * Build browser WebSocket subprotocols for text-stream authentication.
 *
 * @remarks The returned tuple contains the raw API key. Do not log, persist,
 * serialize, or otherwise expose this value.
 *
 * @security The second subprotocol entry is the bearer secret.
 */
export function textStreamAuthProtocols(apiKey: string): TextStreamAuthProtocols {
  const token = validateTextStreamAuthToken(apiKey, 'apiKey')
  if (!WEB_SOCKET_PROTOCOL_TOKEN_RE.test(token)) {
    throw new ConfigurationError(
      'apiKey contains characters browsers reject in WebSocket subprotocols; use client.conversations.textStreamUrl({ serviceId, token: apiKey }) only in trusted contexts where URLs are not logged',
    )
  }
  return ['auth', token] as const
}

function buildTextStreamUrl({
  baseUrl,
  workspaceId,
  serviceId,
  conversationId,
  entityId,
  token,
  textStreamUrl,
}: TextStreamUrlParams & { baseUrl: string; workspaceId: string }): URL {
  const url = textStreamUrl
    ? parseTextStreamUrlOverride(textStreamUrl)
    : deriveTextStreamUrl(baseUrl)
  url.searchParams.set('workspace_id', workspaceId)
  url.searchParams.set('service_id', serviceId)
  if (conversationId) url.searchParams.set('conversation_id', conversationId)
  if (entityId) url.searchParams.set('entity_id', entityId)
  if (token !== undefined)
    url.searchParams.set('token', validateTextStreamAuthToken(token, 'token'))
  return url
}

function validateTextStreamAuthToken(token: string, label: string): string {
  if (!token.trim()) {
    throw new ConfigurationError(`${label} is required for text-stream authentication`)
  }
  if (token.length > MAX_AUTH_TOKEN_CHARS || !TEXT_STREAM_AUTH_TOKEN_RE.test(token)) {
    throw new ConfigurationError(
      `${label} contains characters rejected by text-stream authentication`,
    )
  }
  return token
}

function parseTextStreamUrlOverride(textStreamUrl: string): URL {
  try {
    const url = new URL(textStreamUrl)
    url.search = ''
    url.hash = ''
    return url
  } catch (cause) {
    throw new ConfigurationError(
      `textStreamUrl must be an absolute URL for text-stream overrides: ${String(cause)}`,
    )
  }
}

function deriveTextStreamUrl(baseUrl: string): URL {
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(baseUrl)) {
    throw new ConfigurationError(
      'textStreamUrl cannot be derived from a relative baseUrl; pass textStreamUrl explicitly',
    )
  }

  const url = new URL(baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  // Text streaming is served by agent-engine ingress, regardless of any REST
  // API path segments on the configured base URL.
  url.pathname = '/voice-agent/agent/text-stream'
  url.search = ''
  url.hash = ''
  return url
}
