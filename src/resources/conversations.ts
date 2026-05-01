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
export type TurnStreamEvent = components['schemas']['TurnStreamEvent']
export type TurnTokenEvent = components['schemas']['TurnTokenEvent']
export type TurnToolCallStartedEvent = components['schemas']['TurnToolCallStartedEvent']
export type TurnToolCallCompletedEvent = components['schemas']['TurnToolCallCompletedEvent']
export type TurnThinkingEvent = components['schemas']['TurnThinkingEvent']
export type TurnMessageEvent = components['schemas']['TurnMessageEvent']
export type TurnDoneEvent = components['schemas']['TurnDoneEvent']
export type TurnErrorEvent = components['schemas']['TurnErrorEvent']

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
   * Enable `tool_call_started` and `tool_call_completed` frames on the
   * text-stream WebSocket so the client can render tool invocations in
   * real time.
   */
  toolEvents?: boolean
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

/**
 * Hand-authored because the workspace-scoped session-connect WebSocket is
 * intentionally outside the generated OpenAPI REST snapshot.
 *
 * Path: ``WS /v1/{workspace_id}/sessions/connect``. Authentication is delivered
 * via the ``Sec-WebSocket-Protocol: auth, <token>`` subprotocol header — the
 * server rejects query-param tokens to keep credentials out of URLs and proxy
 * logs. ``serviceId`` and ``entityId`` are required path/query inputs.
 *
 * @beta The session-connect WebSocket contract may evolve independently of the REST API.
 */
export interface SessionConnectUrlParams {
  serviceId: string
  entityId: string
  conversationId?: string
  /**
   * Emit ``tool_call_started`` and ``tool_call_completed`` frames so the client
   * can render tool invocations in real time. Server defaults to ``true`` when
   * the param is omitted; the SDK only sets it explicitly when the caller asks
   * to disable tool events.
   */
  toolEvents?: boolean
  /**
   * Full session-connect URL override for preview/custom ingress. Defaults to
   * ``${baseUrl origin}/v1/{workspace_id}/sessions/connect`` with ``http`` mapped
   * to ``ws`` and ``https`` mapped to ``wss``. The override must be an
   * absolute ws/wss URL with no query string or fragment — SDK-managed query
   * params are appended by the helper.
   */
  sessionConnectUrl?: string
}

const MAX_AUTH_TOKEN_CHARS = 4096
const TEXT_STREAM_AUTH_TOKEN_RE = /^[-A-Za-z0-9._+=/:]+$/
const WEB_SOCKET_PROTOCOL_TOKEN_RE = /^[!#$%&'*+\-.^_`|~A-Za-z0-9]+$/

export type ListConversationsParams = NonNullable<
  operations['list_conversations_v1__workspace_id__conversations_get']['parameters']['query']
>

/** Access text conversation APIs and text-stream URL helpers. */
export class ConversationsResource extends WorkspaceScopedResource {
  private readonly agentBaseUrl: string | undefined

  constructor(client: PlatformFetch, workspaceId: string, agentBaseUrl?: string) {
    super(client, workspaceId)
    this.agentBaseUrl = agentBaseUrl
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

  /**
   * Send a message and receive the agent's response as an SSE stream.
   *
   * Returns a `ReadableStream` of SSE bytes. Use `EventSourceParserStream`
   * (from `eventsource-parser/stream`) to parse into typed `TurnStreamEvent`.
   *
   * @example
   * ```ts
   * const stream = await client.conversations.createTurnStream(convId, { message: "Hello" });
   * const events = stream
   *   .pipeThrough(new TextDecoderStream())
   *   .pipeThrough(new EventSourceParserStream());
   * for await (const event of events) {
   *   const parsed = JSON.parse(event.data) as TurnStreamEvent;
   *   if (parsed.event === "token") console.log(parsed.text);
   * }
   * ```
   */
  async createTurnStream(
    conversationId: string,
    request: TurnRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ReadableStream<Uint8Array>> {
    const result = await this.client.POST(
      '/v1/{workspace_id}/conversations/{conversation_id}/turns',
      {
        params: {
          path: { workspace_id: this.workspaceId, conversation_id: conversationId },
        },
        body: request,
        headers: { Accept: 'text/event-stream' },
        parseAs: 'stream',
        signal: options?.signal,
      },
    )
    if (result.error !== undefined) {
      throw new Error(`API error: ${JSON.stringify(result.error)}`)
    }
    return result.data as ReadableStream<Uint8Array>
  }

  /** Build the real-time text WebSocket URL for browser or custom clients. */
  textStreamUrl(params: TextStreamUrlParams): string {
    const url = buildTextStreamUrl({
      baseUrl: this.agentBaseUrl ?? this.platformBaseUrl,
      workspaceId: this.workspaceId,
      ...params,
    })
    return url.toString()
  }

  /**
   * Build the URL for the workspace-scoped session-connect WebSocket
   * (``WS /v1/{workspace_id}/sessions/connect``).
   *
   * Pair the returned URL with {@link sessionConnectAuthProtocols} so the
   * bearer token is delivered via the ``Sec-WebSocket-Protocol`` header — the
   * endpoint rejects query-param tokens to keep credentials out of URLs.
   *
   * @example
   * ```ts
   * const url = client.conversations.sessionConnectUrl({
   *   serviceId: SERVICE_ID,
   *   entityId: ENTITY_ID,
   *   conversationId: existingConversationId, // optional resume
   * });
   * const ws = new WebSocket(url, sessionConnectAuthProtocols(apiKey));
   * ```
   */
  sessionConnectUrl(params: SessionConnectUrlParams): string {
    const url = buildSessionConnectUrl({
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

/**
 * Build browser WebSocket subprotocols for the workspace-scoped session-connect
 * endpoint (``WS /v1/{workspace_id}/sessions/connect``).
 *
 * The wire format is identical to {@link textStreamAuthProtocols} — both
 * endpoints expect ``Sec-WebSocket-Protocol: auth, <token>`` — but the
 * session-connect endpoint has no query-param token fallback, so the API key
 * MUST round-trip through this subprotocol pair. Keys containing characters
 * browsers reject in subprotocols (e.g. ``:``, ``/``, ``=``) cannot be used
 * with the session-connect endpoint and must instead use the legacy
 * ``textStreamUrl`` path.
 *
 * @remarks The returned tuple contains the raw API key. Do not log, persist,
 * serialize, or otherwise expose this value.
 *
 * @security The second subprotocol entry is the bearer secret.
 */
export function sessionConnectAuthProtocols(apiKey: string): TextStreamAuthProtocols {
  return textStreamAuthProtocols(apiKey)
}

function buildTextStreamUrl({
  baseUrl,
  workspaceId,
  serviceId,
  conversationId,
  entityId,
  toolEvents,
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
  if (toolEvents) url.searchParams.set('tool_events', 'true')
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
      'textStreamUrl cannot be derived from a relative baseUrl; pass agentBaseUrl or textStreamUrl explicitly',
    )
  }

  const url = new URL(baseUrl)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    // Already a WebSocket URL (e.g. from agentBaseUrl) — use directly
  } else if (url.protocol === 'http:' || url.protocol === 'https:') {
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  } else {
    throw new ConfigurationError(
      'textStreamUrl can only be derived from an http, https, ws, or wss baseUrl; pass textStreamUrl explicitly',
    )
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new ConfigurationError(
      'textStreamUrl can only be derived from an origin-only baseUrl; pass agentBaseUrl as an origin or textStreamUrl explicitly when using path-prefixed gateways',
    )
  }
  // Text streaming is served by agent-engine ingress, regardless of any REST
  // API path segments on the configured base URL.
  url.pathname = '/agent/text-stream'
  url.search = ''
  url.hash = ''
  return url
}

function buildSessionConnectUrl({
  baseUrl,
  workspaceId,
  serviceId,
  entityId,
  conversationId,
  toolEvents,
  sessionConnectUrl: sessionConnectUrlOverride,
}: SessionConnectUrlParams & { baseUrl: string; workspaceId: string }): URL {
  const url = sessionConnectUrlOverride
    ? parseSessionConnectUrlOverride(sessionConnectUrlOverride)
    : deriveSessionConnectUrl(baseUrl, workspaceId)
  url.searchParams.set('service_id', serviceId)
  url.searchParams.set('entity_id', entityId)
  if (conversationId) url.searchParams.set('conversation_id', conversationId)
  // Server defaults tool_events to true. Only emit the param when the caller
  // explicitly disables it, so default URLs stay minimal and existing tests
  // can assert exact URLs without incidental query keys.
  if (toolEvents === false) url.searchParams.set('tool_events', 'false')
  return url
}

function parseSessionConnectUrlOverride(sessionConnectUrl: string): URL {
  try {
    const url = new URL(sessionConnectUrl)
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      throw new ConfigurationError('sessionConnectUrl overrides must use ws: or wss: URLs')
    }
    if (url.search || url.hash) {
      throw new ConfigurationError(
        'sessionConnectUrl overrides must not include query parameters or fragments; pass SDK-managed fields through sessionConnectUrl() options',
      )
    }
    return url
  } catch (cause) {
    if (cause instanceof ConfigurationError) throw cause
    throw new ConfigurationError(
      `sessionConnectUrl must be an absolute URL for session-connect overrides: ${String(cause)}`,
    )
  }
}

function deriveSessionConnectUrl(baseUrl: string, workspaceId: string): URL {
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(baseUrl)) {
    throw new ConfigurationError(
      'sessionConnectUrl cannot be derived from a relative baseUrl; pass sessionConnectUrl explicitly',
    )
  }

  const url = new URL(baseUrl)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    // Already a WebSocket URL — use directly.
  } else if (url.protocol === 'http:' || url.protocol === 'https:') {
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  } else {
    throw new ConfigurationError(
      'sessionConnectUrl can only be derived from an http, https, ws, or wss baseUrl; pass sessionConnectUrl explicitly',
    )
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new ConfigurationError(
      'sessionConnectUrl can only be derived from an origin-only baseUrl; pass sessionConnectUrl explicitly when using path-prefixed gateways',
    )
  }
  url.pathname = `/v1/${workspaceId}/sessions/connect`
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
