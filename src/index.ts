/**
 * @amigo-ai/platform-sdk
 *
 * Official TypeScript SDK for the Amigo Platform API.
 *
 * @example
 * ```typescript
 * import { AmigoClient } from '@amigo-ai/platform-sdk'
 *
 * const client = new AmigoClient({
 *   apiKey: 'your-api-key',
 *   workspaceId: 'your-workspace-id',
 * })
 *
 * const agents = await client.agents.list()
 * console.log(agents.items)
 * ```
 */

import type { FetchResponse, HeadersOptions } from 'openapi-fetch'
import type { MediaType, PathsWithMethod } from 'openapi-typescript-helpers'
import { ConfigurationError } from './core/errors.js'
import {
  applyPlatformRequestOptions,
  createPlatformClient,
  type ClientHooks,
  type PlatformFetch,
} from './core/openapi-client.js'
import {
  mergeRequestOptions,
  type AmigoRequestOptions,
  type InitParam,
  type OperationFor,
  type ScopedRequestOptions,
} from './core/request-options.js'
import type { RetryOptions } from './core/retry.js'
import { WorkspacesResource } from './resources/workspaces.js'
import { ApiKeysResource } from './resources/api-keys.js'
import { AgentsResource } from './resources/agents.js'
import { SkillsResource } from './resources/skills.js'
import { ActionsResource } from './resources/actions.js'
import { OperatorsResource } from './resources/operators.js'
import { TriggersResource } from './resources/triggers.js'
import { ServicesResource } from './resources/services.js'
import { ContextGraphsResource } from './resources/context-graphs.js'
import { DataSourcesResource } from './resources/data-sources.js'
import { WorldResource } from './resources/world.js'
import { CallsResource } from './resources/calls.js'
import { ConversationsResource } from './resources/conversations.js'
import { PhoneNumbersResource } from './resources/phone-numbers.js'
import { IntegrationsResource } from './resources/integrations.js'
import { AnalyticsResource } from './resources/analytics.js'
import { SimulationsResource } from './resources/simulations.js'
import { MetricsResource } from './resources/metrics.js'
import { SettingsResource } from './resources/settings.js'
import { BillingResource } from './resources/billing.js'
import { MemoryResource } from './resources/memory.js'
import { PersonasResource } from './resources/personas.js'
import { ReviewQueueResource } from './resources/review-queue.js'
import { RecordingsResource } from './resources/recordings.js'
import { AuditResource } from './resources/audit.js'
import { WebhookDestinationsResource } from './resources/webhook-destinations.js'
import { SafetyResource } from './resources/safety.js'
import { ComplianceResource } from './resources/compliance.js'
import { EventsResource } from './resources/events.js'
import { FunctionsResource } from './resources/functions.js'
import { ObserversResource } from './resources/observers.js'
import { resolveScopedPlatformClient, scopePlatformClient } from './resources/base.js'
import type { components, paths } from './generated/api.js'
import type { MetricValue as MetricValueAlias } from './resources/metrics.js'
import { withResponse, type AmigoResponse } from './core/utils.js'

export const DEFAULT_BASE_URL = 'https://api.platform.amigo.ai'

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
// The generated client exposes TRACE, but the SDK only publishes helpers for
// platform methods that exist in the committed OpenAPI snapshot.
type PlatformMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch'
type EmptyOptions = Record<never, never>
type PathForMethod<Method extends PlatformMethod> = Extract<PathsWithMethod<paths, Method>, string>
type SuccessData<Operation extends Record<string | number, unknown>> = Extract<
  FetchResponse<Operation, EmptyOptions, MediaType>,
  { error?: never }
>['data']
type IsNever<Value> = [Value] extends [never] ? true : false
type DefinedSuccessData<Operation extends Record<string | number, unknown>> = Exclude<
  SuccessData<Operation>,
  undefined
>
// Success data preserves nullable response bodies. Endpoints with no success
// body resolve to undefined so low-level helpers can represent 204/205 results.
type OperationResponse<
  Path extends keyof paths & string,
  Method extends PlatformMethod,
> = Method extends keyof paths[Path]
  ? paths[Path][Method] extends infer Operation extends Record<string | number, unknown>
    ? IsNever<SuccessData<Operation>> extends true
      ? never
      : // Preserve nullable success bodies; only no-content operations collapse to undefined.
        [DefinedSuccessData<Operation>] extends [never]
        ? undefined
        : DefinedSuccessData<Operation>
    : never
  : never

export interface AmigoClientConfig {
  /** API key created via POST /v1/{workspace_id}/api-keys */
  apiKey: string

  /** Workspace ID — all resource operations are scoped to this workspace */
  workspaceId: string

  /**
   * Override the base URL. Defaults to https://api.platform.amigo.ai
   *
   * For BFF proxy patterns (e.g., Next.js), point this at your proxy:
   * ```ts
   * new AmigoClient({ baseUrl: '/api/platform', ... })
   * ```
   */
  baseUrl?: string

  /** Retry configuration for failed requests */
  retry?: RetryOptions

  /** Convenience alias for retry count (same semantics as "number of retries") */
  maxRetries?: number

  /** Default request timeout in milliseconds */
  timeout?: number

  /** Additional headers sent with every request */
  headers?: HeadersOptions

  /** Request lifecycle hooks for logging, tracing, or metrics */
  hooks?: ClientHooks

  /**
   * Custom fetch implementation.
   *
   * Use for BFF proxy routing, server-side cookie forwarding,
   * or test mocking. When provided, all HTTP requests flow
   * through this function instead of globalThis.fetch.
   */
  fetch?: typeof globalThis.fetch

  /**
   * Base URL for the agent engine (voice-agent) WebSocket endpoints.
   *
   * Required when `baseUrl` points to a BFF proxy or a different host
   * than the agent engine — WebSockets cannot traverse HTTP proxies.
   * Used by `conversations.textStreamUrl()` to build the `ws://` URL.
   *
   * Accepts `http://` or `https://` (auto-mapped to `ws://` / `wss://`)
   * or direct `ws://` / `wss://` URLs.
   *
   * Defaults to deriving from `baseUrl` (works when REST API and agent
   * engine share the same origin).
   *
   * ```ts
   * new AmigoClient({
   *   baseUrl: '/api/platform',  // BFF proxy for REST
   *   agentBaseUrl: 'wss://api.platform.amigo.ai',  // direct for WS
   *   ...
   * })
   * ```
   */
  agentBaseUrl?: string
}

export class AmigoClient {
  readonly workspaceId!: string
  readonly baseUrl!: string
  readonly agentBaseUrl!: string | undefined
  readonly workspaces!: WorkspacesResource
  readonly apiKeys!: ApiKeysResource
  readonly agents!: AgentsResource
  /** @deprecated Use `actions` instead */
  readonly skills!: SkillsResource
  readonly actions!: ActionsResource
  readonly operators!: OperatorsResource
  readonly triggers!: TriggersResource
  readonly services!: ServicesResource
  readonly contextGraphs!: ContextGraphsResource
  readonly dataSources!: DataSourcesResource
  readonly world!: WorldResource
  readonly calls!: CallsResource
  readonly conversations!: ConversationsResource
  readonly phoneNumbers!: PhoneNumbersResource
  readonly integrations!: IntegrationsResource
  readonly analytics!: AnalyticsResource
  readonly simulations!: SimulationsResource
  readonly metrics!: MetricsResource
  readonly settings!: SettingsResource
  readonly billing!: BillingResource
  readonly memory!: MemoryResource
  readonly personas!: PersonasResource
  readonly reviewQueue!: ReviewQueueResource
  readonly recordings!: RecordingsResource
  readonly audit!: AuditResource
  readonly webhookDestinations!: WebhookDestinationsResource
  readonly safety!: SafetyResource
  readonly compliance!: ComplianceResource
  readonly events!: EventsResource
  readonly functions!: FunctionsResource
  /**
   * Voice-call observer real-time stream. Subscribe with
   * ``client.observers.subscribe({ callSid, token, onEvent })``. See
   * {@link ObserversResource}.
   */
  readonly observers!: ObserversResource
  /** @internal — exposed for path-level type inference in GET/POST/PUT/etc. */
  readonly api!: PlatformFetch

  constructor(config: AmigoClientConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new ConfigurationError('apiKey is required and must be a non-empty string')
    }
    if (!config.workspaceId || typeof config.workspaceId !== 'string') {
      throw new ConfigurationError('workspaceId is required and must be a non-empty string')
    }

    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

    const client = createPlatformClient({
      apiKey: config.apiKey,
      baseUrl,
      retry: config.retry,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      headers: config.headers,
      hooks: config.hooks,
      fetch: config.fetch,
    })

    AmigoClient.hydrate(this, client, config.workspaceId, baseUrl, config.agentBaseUrl)
  }

  withOptions(options: ScopedRequestOptions): AmigoClient {
    return AmigoClient.fromPlatformClient(
      scopePlatformClient(this.api, options),
      this.workspaceId,
      this.baseUrl,
      this.agentBaseUrl,
    )
  }

  async GET<Path extends PathForMethod<'get'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'get'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'get'>>> {
    return withResponse(await this.resolveApiRequest(path, 'GET', init)) as AmigoResponse<
      OperationResponse<Path, 'get'>
    >
  }

  async POST<Path extends PathForMethod<'post'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'post'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'post'>>> {
    return withResponse(await this.resolveApiRequest(path, 'POST', init)) as AmigoResponse<
      OperationResponse<Path, 'post'>
    >
  }

  async PUT<Path extends PathForMethod<'put'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'put'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'put'>>> {
    return withResponse(await this.resolveApiRequest(path, 'PUT', init)) as AmigoResponse<
      OperationResponse<Path, 'put'>
    >
  }

  async PATCH<Path extends PathForMethod<'patch'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'patch'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'patch'>>> {
    return withResponse(await this.resolveApiRequest(path, 'PATCH', init)) as AmigoResponse<
      OperationResponse<Path, 'patch'>
    >
  }

  async DELETE<Path extends PathForMethod<'delete'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'delete'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'delete'>>> {
    return withResponse(await this.resolveApiRequest(path, 'DELETE', init)) as AmigoResponse<
      OperationResponse<Path, 'delete'>
    >
  }

  async HEAD<Path extends PathForMethod<'head'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'head'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'head'>>> {
    return withResponse(await this.resolveApiRequest(path, 'HEAD', init), {
      allowEmptyBody: true,
    }) as AmigoResponse<OperationResponse<Path, 'head'>>
  }

  async OPTIONS<Path extends PathForMethod<'options'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'options'>>>
  ): Promise<AmigoResponse<OperationResponse<Path, 'options'>>> {
    return withResponse(await this.resolveApiRequest(path, 'OPTIONS', init), {
      allowEmptyBody: true,
    }) as AmigoResponse<OperationResponse<Path, 'options'>>
  }

  /**
   * Bind a path literal + method to a fully-typed callable.
   *
   * Captures the path as a literal type at definition time, so the returned
   * callable keeps full request/response inference even when stored,
   * exported, or composed across modules. Solves the "explicit `as const` on
   * path params" footgun: consumers who store a path in a `string` variable
   * lose path inference and the SDK collapses to `unknown`.
   *
   * ```ts
   * const getCall = client.defineRoute('GET', '/v1/{workspace_id}/calls/{call_id}')
   * const call = await getCall({ params: { path: { call_id } } })
   * // call.data: CallDetailResponse | undefined  (fully typed)
   * ```
   *
   * Workspace IDs are still auto-injected by the underlying dispatchers — the
   * helper is purely a type-level convenience. Runtime behavior is identical
   * to calling the matching method directly, so retries, hooks, error
   * conversion, and timeout handling all apply.
   */
  defineRoute<Path extends PathForMethod<'get'>>(
    method: 'GET',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'get'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'get'>>>
  defineRoute<Path extends PathForMethod<'post'>>(
    method: 'POST',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'post'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'post'>>>
  defineRoute<Path extends PathForMethod<'put'>>(
    method: 'PUT',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'put'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'put'>>>
  defineRoute<Path extends PathForMethod<'patch'>>(
    method: 'PATCH',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'patch'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'patch'>>>
  defineRoute<Path extends PathForMethod<'delete'>>(
    method: 'DELETE',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'delete'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'delete'>>>
  defineRoute<Path extends PathForMethod<'head'>>(
    method: 'HEAD',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'head'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'head'>>>
  defineRoute<Path extends PathForMethod<'options'>>(
    method: 'OPTIONS',
    path: Path,
  ): (
    ...args: InitParam<AmigoRequestOptions<OperationFor<Path, 'options'>>>
  ) => Promise<AmigoResponse<OperationResponse<Path, 'options'>>>
  defineRoute(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
    path: string,
  ): (init?: AmigoRequestOptions<unknown>) => Promise<AmigoResponse<unknown>> {
    type AnyDispatcher = (p: string, i?: unknown) => Promise<AmigoResponse<unknown>>
    const dispatcher = this[method] as unknown as AnyDispatcher
    return (init?: AmigoRequestOptions<unknown>) => dispatcher.call(this, path, init)
  }

  private static fromPlatformClient(
    client: PlatformFetch,
    workspaceId: string,
    baseUrl: string,
    agentBaseUrl?: string,
  ): AmigoClient {
    const instance = Object.create(AmigoClient.prototype) as AmigoClient
    AmigoClient.hydrate(instance, client, workspaceId, baseUrl, agentBaseUrl)
    return instance
  }

  private static hydrate(
    target: AmigoClient,
    client: PlatformFetch,
    workspaceId: string,
    baseUrl: string,
    agentBaseUrl?: string,
  ): void {
    const mutable = target as Mutable<AmigoClient>

    mutable.workspaceId = workspaceId
    mutable.baseUrl = baseUrl
    mutable.agentBaseUrl = agentBaseUrl
    ;(target as unknown as { api: PlatformFetch }).api = client

    mutable.workspaces = new WorkspacesResource(client, workspaceId)
    mutable.apiKeys = new ApiKeysResource(client, workspaceId)
    mutable.agents = new AgentsResource(client, workspaceId)
    mutable.skills = new SkillsResource(client, workspaceId)
    mutable.actions = new ActionsResource(client, workspaceId)
    mutable.operators = new OperatorsResource(client, workspaceId)
    mutable.triggers = new TriggersResource(client, workspaceId)
    mutable.services = new ServicesResource(client, workspaceId)
    mutable.contextGraphs = new ContextGraphsResource(client, workspaceId)
    mutable.dataSources = new DataSourcesResource(client, workspaceId)
    mutable.world = new WorldResource(client, workspaceId)
    mutable.calls = new CallsResource(client, workspaceId)
    mutable.conversations = new ConversationsResource(client, workspaceId, agentBaseUrl)
    mutable.phoneNumbers = new PhoneNumbersResource(client, workspaceId)
    mutable.integrations = new IntegrationsResource(client, workspaceId)
    mutable.analytics = new AnalyticsResource(client, workspaceId)
    mutable.simulations = new SimulationsResource(client, workspaceId)
    mutable.metrics = new MetricsResource(client, workspaceId)
    mutable.settings = new SettingsResource(client, workspaceId)
    mutable.billing = new BillingResource(client, workspaceId)
    mutable.memory = new MemoryResource(client, workspaceId)
    mutable.personas = new PersonasResource(client, workspaceId)
    mutable.reviewQueue = new ReviewQueueResource(client, workspaceId)
    mutable.recordings = new RecordingsResource(client, workspaceId)
    mutable.audit = new AuditResource(client, workspaceId)
    mutable.webhookDestinations = new WebhookDestinationsResource(client, workspaceId)
    mutable.safety = new SafetyResource(client, workspaceId)
    mutable.compliance = new ComplianceResource(client, workspaceId)
    mutable.events = new EventsResource(client, workspaceId)
    mutable.functions = new FunctionsResource(client, workspaceId)
    mutable.observers = new ObserversResource(client, workspaceId, agentBaseUrl)
  }

  private async resolveApiRequest<
    Path extends keyof paths & string,
    Method extends 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
  >(
    path: Path,
    method: Method,
    init: AmigoRequestOptions<OperationFor<Path, Lowercase<Method>>> | undefined,
  ): Promise<{ data?: unknown; error?: unknown; response: Response }> {
    const { baseClient, options } = resolveScopedPlatformClient(this.api)
    const mergedInit = mergeRequestOptions(options, withWorkspaceId(path, init, this.workspaceId))
    const requestInit = applyPlatformRequestOptions(
      baseClient,
      mergedInit as AmigoRequestOptions<OperationFor<Path, Lowercase<Method>>> | undefined,
    )

    switch (method) {
      case 'GET':
        return await baseClient.GET(path as never, requestInit as never)
      case 'POST':
        return await baseClient.POST(path as never, requestInit as never)
      case 'PUT':
        return await baseClient.PUT(path as never, requestInit as never)
      case 'PATCH':
        return await baseClient.PATCH(path as never, requestInit as never)
      case 'DELETE':
        return await baseClient.DELETE(path as never, requestInit as never)
      case 'HEAD':
        return await baseClient.HEAD(path as never, requestInit as never)
      case 'OPTIONS':
        return await baseClient.OPTIONS(path as never, requestInit as never)
    }
  }
}

// --- Public exports ---

export type { AmigoClientConfig as AmigoConfig }

export {
  AmigoError,
  BadRequestError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  NetworkError,
  RequestTimeoutError,
  ParseError,
  ConfigurationError,
  isAmigoError,
  isNotFoundError,
  isRateLimitError,
  isAuthenticationError,
  isRequestTimeoutError,
  isPermissionError,
  isConflictError,
  isValidationError,
  isServerError,
  isNetworkError,
  isHttpException,
  isHttpValidationError,
  isUnparseableErrorBody,
} from './core/errors.js'

export type {
  ErrorContext,
  PlatformErrorBody,
  HttpExceptionBody,
  HttpValidationErrorBody,
  UnparseableErrorBody,
  AmigoErrorWithBody,
} from './core/errors.js'

export type {
  WorkspaceId,
  ApiKeyId,
  AgentId,
  PersonaId,
  SkillId,
  ActionId,
  ServiceId,
  ContextGraphId,
  CallId,
  PhoneNumberId,
  IntegrationId,
  EntityId,
  EventId,
  SimulationRunId,
  SimulationSessionId,
  FunctionId,
  DataSourceId,
} from './core/branded-types.js'

export {
  workspaceId,
  apiKeyId,
  agentId,
  personaId,
  skillId,
  actionId,
  serviceId,
  contextGraphId,
  callId,
  phoneNumberId,
  integrationId,
  entityId,
  eventId,
  simulationRunId,
  simulationSessionId,
  functionId,
  dataSourceId,
} from './core/branded-types.js'

export { paginate } from './core/utils.js'
export { buildLastResponse, extractRequestId } from './core/utils.js'
export type {
  PaginatedList,
  ListParams,
  LastResponseInfo,
  ResponseMetadata,
  WithResponseMetadata,
  AmigoResponse,
} from './core/utils.js'
export type { AmigoRequestOptions, ScopedRequestOptions } from './core/request-options.js'
export type { RetryOptions } from './core/retry.js'

export { parseRateLimitHeaders } from './core/rate-limit.js'
export type { RateLimitInfo } from './core/rate-limit.js'

export {
  verifyWebhookSignature,
  parseWebhookEvent,
  WebhookVerificationError,
} from './core/webhooks.js'
export type {
  WebhookEvent,
  WebhookVerificationOptions,
  ParseWebhookEventOptions,
} from './core/webhooks.js'
export type {
  ClientHooks,
  RequestHookContext,
  ResponseHookContext,
  ErrorHookContext,
} from './core/openapi-client.js'

export type {
  MetricCatalogEntry,
  MetricCatalogResponse,
  MetricListResponse,
  MetricValue,
  NumericalMetricValue,
  CategoricalMetricValue,
  BooleanMetricValue,
  MetricValuesParams,
  MetricTrendParams,
} from './resources/metrics.js'
/** @deprecated Use `MetricValue` instead. */
export type MetricValueResponse = MetricValueAlias

export type CallSummary = components['schemas']['CallSummary']
export type CallDetail = components['schemas']['CallDetailResponse']
export type CallTurn = components['schemas']['Turn']
export type CallToolCall = components['schemas']['ToolCall']
export type PlaybackTimeline = components['schemas']['PlaybackTimeline']
export type TimelineActor = components['schemas']['TimelineActor']
export type TimelineLaneDefinition = components['schemas']['TimelineLaneDefinition']
export type TimelineSegment = components['schemas']['TimelineSegment']
export type TimelineTimebase = components['schemas']['TimelineTimebase']
export type TurnTimeline = components['schemas']['TurnTimeline']
export type TimelineSegmentType = TimelineSegment['type']
export type TimelineLane = TimelineSegment['lane']
export type TimelineTrack = NonNullable<TimelineSegment['track']>
export type TimelineActorKind = TimelineActor['kind']
export type TimelineActorRole = TimelineActor['role']

export type {
  SubscribeToWorkspaceOptions,
  SubscriptionHandle,
  WorkspaceSSEEvent,
  WorkspaceSSEEventType,
  WorkspaceEventStreamErrorCode,
} from './resources/events.js'
export {
  WorkspaceEventStreamError,
  isWorkspaceEventStreamError,
} from './resources/events.js'

export { sessionConnectAuthProtocols, textStreamAuthProtocols } from './resources/conversations.js'
export type {
  ConversationDetail,
  ConversationListResponse,
  ConversationSummary,
  ConversationTurn,
  CreateConversationRequest,
  ListConversationsParams,
  SessionConnectUrlParams,
  TextStreamAuthProtocols,
  TextStreamUrlParams,
  TurnDoneEvent,
  TurnErrorEvent,
  TurnMessageEvent,
  TurnRequest,
  TurnResponse,
  TurnStreamEvent,
  TurnThinkingEvent,
  TurnTokenEvent,
  TurnToolCallCompletedEvent,
  TurnToolCallStartedEvent,
} from './resources/conversations.js'

// Voice-call observer real-time stream
export { ObserversResource, observerAuthProtocols } from './resources/observers.js'
export type {
  ObserverAuthProtocols,
  ObserverSSEEvent,
  ObserverSSEEventType,
  ObserverSubscribeOptions,
} from './resources/observers.js'

// Reconnecting WebSocket primitive (compose for custom realtime surfaces)
export {
  createReconnectingWebSocket,
  ReconnectingWebSocketError,
} from './core/reconnecting-websocket.js'
export type {
  ReconnectingWebSocketErrorReason,
  ReconnectingWebSocketHandle,
  ReconnectingWebSocketOptions,
  ReconnectingWebSocketState,
  WebSocketFactory,
} from './core/reconnecting-websocket.js'

// Device code auth (desktop / CLI login)
export {
  loginWithDeviceCode,
  TokenManager,
  FileTokenStorage,
  MemoryTokenStorage,
  DeviceCodeExpiredError,
  DeviceCodeDeniedError,
  RefreshTokenExpiredError,
  LoginCancelledError,
  formatDeviceCodeInstructions,
  formatDeviceCodeLink,
  formatWorkspaceList,
  openBrowser,
} from './core/device-code.js'
export type {
  DeviceCodeIssuance,
  IdentityTokenResponse,
  WorkspaceChoice,
  MultiWorkspaceResponse,
  DeviceCodeLoginOptions,
  DeviceCodeStatus,
  AuthResult,
  StoredCredentials,
  TokenStorage,
  TokenManagerConfig,
} from './core/device-code.js'

// Generated OpenAPI types — consumers can import specific schemas
export type { paths, components, operations } from './generated/api.js'

function withWorkspaceId<Path extends keyof paths & string, Init>(
  path: Path,
  init: Init | undefined,
  workspaceId: string,
): Init | { params: { path: { workspace_id: string } } } {
  if (!path.includes('{workspace_id}')) {
    return (init ?? {}) as Init
  }

  const current = (init ?? {}) as {
    params?: {
      path?: Record<string, unknown>
    }
  }

  return {
    ...current,
    params: {
      ...(current.params ?? {}),
      path: {
        ...(current.params?.path ?? {}),
        workspace_id: workspaceId,
      },
    },
  }
}
