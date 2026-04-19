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

import type {
  ClientPathsWithMethod,
  FetchOptions,
  HeadersOptions,
  MethodResponse,
} from 'openapi-fetch'
import { ConfigurationError } from './core/errors.js'
import { createPlatformClient, type ClientHooks } from './core/openapi-client.js'
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
import type { paths } from './generated/api.js'
import { withResponse, type AmigoResponse } from './core/utils.js'

export const DEFAULT_BASE_URL = 'https://api.platform.amigo.ai'

type OperationFor<
  Path extends keyof paths & string,
  Method extends keyof paths[Path] & string,
> = paths[Path][Method]

type LowLevelParams<Operation> =
  FetchOptions<Operation> extends { params: infer Params }
    ? Params extends object
      ? Omit<Params, 'path'> & {
          path?: Params extends { path: infer PathParams }
            ? Partial<PathParams & Record<string, unknown>>
            : never
        }
      : never
    : never

export type AmigoRequestOptions<Operation = unknown> = Omit<FetchOptions<Operation>, 'params'> & {
  params?: LowLevelParams<Operation>
  timeout?: number
  maxRetries?: number
  retry?: RetryOptions
}

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
}

export class AmigoClient {
  readonly workspaceId: string
  readonly baseUrl: string
  readonly workspaces: WorkspacesResource
  readonly apiKeys: ApiKeysResource
  readonly agents: AgentsResource
  /** @deprecated Use `actions` instead */
  readonly skills: SkillsResource
  readonly actions: ActionsResource
  readonly operators: OperatorsResource
  readonly triggers: TriggersResource
  readonly services: ServicesResource
  readonly contextGraphs: ContextGraphsResource
  readonly dataSources: DataSourcesResource
  readonly world: WorldResource
  readonly calls: CallsResource
  readonly phoneNumbers: PhoneNumbersResource
  readonly integrations: IntegrationsResource
  readonly analytics: AnalyticsResource
  readonly simulations: SimulationsResource
  readonly settings: SettingsResource
  readonly billing: BillingResource
  readonly memory: MemoryResource
  readonly personas: PersonasResource
  readonly reviewQueue: ReviewQueueResource
  readonly recordings: RecordingsResource
  readonly audit: AuditResource
  readonly webhookDestinations: WebhookDestinationsResource
  readonly safety: SafetyResource
  readonly compliance: ComplianceResource
  readonly functions: FunctionsResource
  private readonly api

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

    const ws = config.workspaceId
    this.workspaceId = ws
    this.baseUrl = baseUrl
    this.api = client

    this.workspaces = new WorkspacesResource(client, ws)
    this.apiKeys = new ApiKeysResource(client, ws)
    this.agents = new AgentsResource(client, ws)
    this.skills = new SkillsResource(client, ws)
    this.actions = new ActionsResource(client, ws)
    this.operators = new OperatorsResource(client, ws)
    this.triggers = new TriggersResource(client, ws)
    this.services = new ServicesResource(client, ws)
    this.contextGraphs = new ContextGraphsResource(client, ws)
    this.dataSources = new DataSourcesResource(client, ws)
    this.world = new WorldResource(client, ws)
    this.calls = new CallsResource(client, ws)
    this.phoneNumbers = new PhoneNumbersResource(client, ws)
    this.integrations = new IntegrationsResource(client, ws)
    this.analytics = new AnalyticsResource(client, ws)
    this.simulations = new SimulationsResource(client, ws)
    this.settings = new SettingsResource(client, ws)
    this.billing = new BillingResource(client, ws)
    this.memory = new MemoryResource(client, ws)
    this.personas = new PersonasResource(client, ws)
    this.reviewQueue = new ReviewQueueResource(client, ws)
    this.recordings = new RecordingsResource(client, ws)
    this.audit = new AuditResource(client, ws)
    this.webhookDestinations = new WebhookDestinationsResource(client, ws)
    this.safety = new SafetyResource(client, ws)
    this.compliance = new ComplianceResource(client, ws)
    this.functions = new FunctionsResource(client, ws)
  }

  async GET<Path extends ClientPathsWithMethod<typeof this.api, 'get'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'get'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'get', Path>>> {
    return withResponse(
      await this.api.GET(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'get', Path>>
  }

  async POST<Path extends ClientPathsWithMethod<typeof this.api, 'post'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'post'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'post', Path>>> {
    return withResponse(
      await this.api.POST(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'post', Path>>
  }

  async PUT<Path extends ClientPathsWithMethod<typeof this.api, 'put'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'put'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'put', Path>>> {
    return withResponse(
      await this.api.PUT(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'put', Path>>
  }

  async PATCH<Path extends ClientPathsWithMethod<typeof this.api, 'patch'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'patch'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'patch', Path>>> {
    return withResponse(
      await this.api.PATCH(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'patch', Path>>
  }

  async DELETE<Path extends ClientPathsWithMethod<typeof this.api, 'delete'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'delete'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'delete', Path>>> {
    return withResponse(
      await this.api.DELETE(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'delete', Path>>
  }

  async HEAD<Path extends ClientPathsWithMethod<typeof this.api, 'head'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'head'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'head', Path>>> {
    return withResponse(
      await this.api.HEAD(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'head', Path>>
  }

  async OPTIONS<Path extends ClientPathsWithMethod<typeof this.api, 'options'>>(
    path: Path,
    init?: AmigoRequestOptions<OperationFor<Path, 'options'>>,
  ): Promise<AmigoResponse<MethodResponse<typeof this.api, 'options', Path>>> {
    return withResponse(
      await this.api.OPTIONS(path, withWorkspaceId(path, init, this.workspaceId) as never),
    ) as AmigoResponse<MethodResponse<typeof this.api, 'options', Path>>
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
        workspace_id: workspaceId,
        ...(current.params?.path ?? {}),
      },
    },
  }
}
