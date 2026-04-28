import { ConfigurationError } from '../core/errors.js'
import { type PlatformFetch } from '../core/openapi-client.js'
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

/**
 * Hand-authored because the text-stream WebSocket endpoint is intentionally
 * outside the generated OpenAPI REST snapshot.
 * TODO: replace with generated types when `/agent/text-stream` is added to
 * openapi.json.
 *
 * @beta The text-stream WebSocket contract may evolve independently of the REST API.
 */
export interface TextStreamUrlParams {
  serviceId: string
  conversationId?: string
  entityId?: string
  /**
   * Bearer token query-param fallback for clients whose API key cannot be sent
   * as a WebSocket subprotocol token. Prefer textStreamAuthProtocols() when
   * the token is subprotocol-safe so secrets do not appear in URLs. The SDK
   * intentionally accepts only the server-supported text-stream token alphabet
   * (letters, digits, `.`, `_`, `+`, `=`, `/`, `:`, `-`) even though
   * URLSearchParams can percent-encode additional characters.
   */
  token?: string
  /**
   * Full text-stream URL override for preview/custom ingress.
   * Defaults to `${baseUrl origin}/agent/text-stream` with
   * `http` mapped to `ws` and `https` mapped to `wss`.
   */
  textStreamUrl?: string
}

/** @beta The text-stream WebSocket contract may evolve independently of the REST API. */
export type TextStreamAuthProtocols = readonly ['auth', string]

const MAX_AUTH_TOKEN_CHARS = 4096
const TEXT_STREAM_AUTH_TOKEN_RE = /^[-A-Za-z0-9._+=/:]+$/
const WEB_SOCKET_PROTOCOL_TOKEN_RE = /^[!#$%&'*+\-.^_`|~A-Za-z0-9]+$/

export type ListConversationsParams = NonNullable<
  operations['list_conversations_v1__workspace_id__conversations_get']['parameters']['query']
>

/** Access text conversation APIs and text-stream URL helpers. */
export class ConversationsResource extends WorkspaceScopedResource {
  constructor(client: PlatformFetch, workspaceId: string) {
    super(client, workspaceId)
  }

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

  async createTurn(conversationId: string, request: TurnRequest): Promise<TurnResponse> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/conversations/{conversation_id}/turns', {
        params: {
          path: { workspace_id: this.workspaceId, conversation_id: conversationId },
        },
        body: request,
      }),
    )
  }

  /** Build the real-time text WebSocket URL for browser or custom clients. */
  textStreamUrl(params: TextStreamUrlParams): string {
    const url = buildTextStreamUrl({
      baseUrl: this.platformBaseUrl,
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
    const invalidChars = describeInvalidSubprotocolChars(token)
    throw new ConfigurationError(
      `apiKey contains characters browsers reject in WebSocket subprotocols (${invalidChars}); use the token option on client.conversations.textStreamUrl() instead for keys containing these characters, only in trusted contexts where URLs are not logged in browser history, server access logs, HTTP proxy logs, or referrer headers`,
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
  textStreamUrl: textStreamUrlOverride,
}: TextStreamUrlParams & { baseUrl: string; workspaceId: string }): URL {
  const url = textStreamUrlOverride
    ? parseTextStreamUrlOverride(textStreamUrlOverride)
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
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      throw new ConfigurationError('textStreamUrl overrides must use ws: or wss: URLs')
    }
    // Fragment rejection is defensive; WHATWG URL parsing normalizes most
    // WebSocket fragments away, but callers should never rely on fragments here.
    if (url.search || url.hash) {
      throw new ConfigurationError(
        'textStreamUrl overrides must not include query parameters or fragments; pass SDK-managed fields through textStreamUrl() options',
      )
    }
    return url
  } catch (cause) {
    if (cause instanceof ConfigurationError) throw cause
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigurationError(
      'textStreamUrl can only be derived from an http or https baseUrl; pass textStreamUrl explicitly',
    )
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new ConfigurationError(
      'textStreamUrl can only be derived from an origin-only http or https baseUrl; pass textStreamUrl explicitly when using path-prefixed gateways',
    )
  }
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  // Text streaming is served by agent-engine ingress, regardless of any REST
  // API path segments on the configured base URL.
  url.pathname = '/agent/text-stream'
  url.search = ''
  url.hash = ''
  return url
}

function describeInvalidSubprotocolChars(token: string): string {
  const chars = new Set<string>()
  for (const char of token) {
    // Single-character regex checks are intentional: the regex is anchored for
    // full-token validation, and here we need only the offending characters.
    if (!WEB_SOCKET_PROTOCOL_TOKEN_RE.test(char)) chars.add(char)
  }
  return [...chars].map((char) => JSON.stringify(char)).join(', ')
}
