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

import type { ClientPathsWithMethod, HeadersOptions, MethodResponse } from 'openapi-fetch'
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
import {
  composeHooks,
  createTelemetryHooks,
  createTelemetryState,
  type LatencyEvent,
  type TelemetryOptions,
  type TelemetryState,
} from './core/telemetry.js'
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
import { PhoneNumbersResource } from './resources/phone-numbers.js'
import { IntegrationsResource } from './resources/integrations.js'
import { AnalyticsResource } from './resources/analytics.js'
import { SimulationsResource } from './resources/simulations.js'
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
import { FunctionsResource } from './resources/functions.js'
import { resolveScopedPlatformClient, scopePlatformClient } from './resources/base.js'
import type { paths } from './generated/api.js'
import { withResponse, type AmigoResponse } from './core/utils.js'

export const DEFAULT_BASE_URL = 'https://api.platform.amigo.ai'

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

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
   * Latency telemetry — emits a {@link LatencyEvent} for every HTTP request,
   * with timing broken into server time vs. network+SDK time. Use this to
   * distinguish Amigo-side latency from your own code's latency when
   * integrating the SDK. Composes with `hooks` — both fire.
   */
  telemetry?: TelemetryOptions

  /**
   * Custom fetch implementation.
   *
   * Use for BFF proxy routing, server-side cookie forwarding,
   * or test mocking. When provided, all HTTP requests flow
   * through this function instead of globalThis.fetch.
   */
  fetch?: typeof globalThis.fetch
}

export class AmigoClient {
  readonly workspaceId!: string
  readonly baseUrl!: string
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
  readonly phoneNumbers!: PhoneNumbersResource
  readonly integrations!: IntegrationsResource
  readonly analytics!: AnalyticsResource
  readonly simulations!: SimulationsResource
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
  readonly functions!: FunctionsResource
  private readonly api!: PlatformFetch
  private readonly telemetry!: TelemetryState

  constructor(config: AmigoClientConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new ConfigurationError('apiKey is required and must be a non-empty string')
    }
    if (!config.workspaceId || typeof config.workspaceId !== 'string') {
      throw new ConfigurationError('workspaceId is required and must be a non-empty string')
    }

    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

    const telemetryState = createTelemetryState(config.telemetry)
    const hooks = composeHooks(createTelemetryHooks(telemetryState), config.hooks)

    const client = createPlatformClient({
      apiKey: config.apiKey,
      baseUrl,
      retry: config.retry,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      headers: config.headers,
      hooks,
      fetch: config.fetch,
    })

    AmigoClient.hydrate(this, client, config.workspaceId, baseUrl, telemetryState)
  }

  withOptions(options: ScopedRequestOptions): AmigoClient {
    return AmigoClient.fromPlatformClient(
      scopePlatformClient(this.api, options),
      this.workspaceId,
      this.baseUrl,
      this.telemetry,
    )
  }

  /**
   * Subscribe to a latency event for every HTTP request made through this client.
   *
   * @returns An unsubscribe function.
   *
   * @example
   * ```ts
   * const unsubscribe = client.onLatency((e) => {
   *   console.log(`${e.method} ${e.path} total=${e.totalMs}ms server=${e.serverMs}ms`)
   * })
   * // later
   * unsubscribe()
   * ```
   */
  onLatency(listener: (event: LatencyEvent) => void): () => void {
    this.telemetry.listeners.add(listener)
    return () => {
      this.telemetry.listeners.delete(listener)
    }
  }

  /**
   * Run `fn` and collect latency events for every SDK call made inside it.
   *
   * ```ts
   * const t0 = performance.now()
   * const { result, events, totalMs } = await client.measureLatency(async () => {
   *   const agent = await client.agents.get('agent-id')
   *   const mem = await client.memory.getEntityFacts('entity-id')
   *   return { agent, mem }
   * })
   * const wall = performance.now() - t0
   * const serverTime = events.reduce((s, e) => s + (e.serverMs ?? 0), 0)
   * const networkTime = events.reduce((s, e) => s + (e.networkMs ?? 0), 0)
   * const yourCode = wall - totalMs
   * ```
   *
   * All listeners see all events; overlapping `measureLatency` scopes observe
   * each other's events. For strict isolation, filter by `clientRequestId` or
   * use distinct client instances.
   */
  async measureLatency<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; events: LatencyEvent[]; totalMs: number }> {
    const events: LatencyEvent[] = []
    const unsubscribe = this.onLatency((e) => events.push(e))
    const t0 =
      (globalThis as { performance?: { now?: () => number } }).performance?.now?.() ?? Date.now()
    try {
      const result = await fn()
      const totalMs =
        ((globalThis as { performance?: { now?: () => number } }).performance?.now?.() ??
          Date.now()) - t0
      return { result, events, totalMs }
    } finally {
      unsubscribe()
    }
  }

  async GET<Path extends ClientPathsWithMethod<typeof this.api, 'get'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'get'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'get', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'GET', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'get', Path>
    >
  }

  async POST<Path extends ClientPathsWithMethod<typeof this.api, 'post'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'post'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'post', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'POST', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'post', Path>
    >
  }

  async PUT<Path extends ClientPathsWithMethod<typeof this.api, 'put'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'put'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'put', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'PUT', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'put', Path>
    >
  }

  async PATCH<Path extends ClientPathsWithMethod<typeof this.api, 'patch'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'patch'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'patch', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'PATCH', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'patch', Path>
    >
  }

  async DELETE<Path extends ClientPathsWithMethod<typeof this.api, 'delete'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'delete'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'delete', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'DELETE', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'delete', Path>
    >
  }

  async HEAD<Path extends ClientPathsWithMethod<typeof this.api, 'head'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'head'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'head', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'HEAD', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'head', Path>
    >
  }

  async OPTIONS<Path extends ClientPathsWithMethod<typeof this.api, 'options'>>(
    path: Path,
    ...[init]: InitParam<AmigoRequestOptions<OperationFor<Path, 'options'>>>
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'options', Path>>> {
    return withResponse(await this.resolveApiRequest(path, 'OPTIONS', init)) as AmigoResponse<
      MethodResponse<typeof this.api, 'options', Path>
    >
  }

  private static fromPlatformClient(
    client: PlatformFetch,
    workspaceId: string,
    baseUrl: string,
    telemetry: TelemetryState,
  ): AmigoClient {
    const instance = Object.create(AmigoClient.prototype) as AmigoClient
    AmigoClient.hydrate(instance, client, workspaceId, baseUrl, telemetry)
    return instance
  }

  private static hydrate(
    target: AmigoClient,
    client: PlatformFetch,
    workspaceId: string,
    baseUrl: string,
    telemetry: TelemetryState,
  ): void {
    const mutable = target as Mutable<AmigoClient>

    mutable.workspaceId = workspaceId
    mutable.baseUrl = baseUrl
    ;(target as unknown as { api: PlatformFetch }).api = client
    ;(target as unknown as { telemetry: TelemetryState }).telemetry = telemetry

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
    mutable.phoneNumbers = new PhoneNumbersResource(client, workspaceId)
    mutable.integrations = new IntegrationsResource(client, workspaceId)
    mutable.analytics = new AnalyticsResource(client, workspaceId)
    mutable.simulations = new SimulationsResource(client, workspaceId)
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
    mutable.functions = new FunctionsResource(client, workspaceId)
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

export type { LatencyEvent, TelemetryOptions } from './core/telemetry.js'

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
