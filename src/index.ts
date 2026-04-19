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

import { ConfigurationError } from './core/errors.js'
import { createPlatformClient } from './core/openapi-client.js'
import type { RetryOptions } from './core/retry.js'
import { WorkspacesResource } from './resources/workspaces.js'
import { ApiKeysResource } from './resources/api-keys.js'
import { AgentsResource } from './resources/agents.js'
import { SkillsResource } from './resources/skills.js'
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

export const DEFAULT_BASE_URL = 'https://api.platform.amigo.ai'

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
  readonly workspaces: WorkspacesResource
  readonly apiKeys: ApiKeysResource
  readonly agents: AgentsResource
  readonly skills: SkillsResource
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
      fetch: config.fetch,
    })

    const ws = config.workspaceId

    this.workspaces = new WorkspacesResource(client, ws)
    this.apiKeys = new ApiKeysResource(client, ws)
    this.agents = new AgentsResource(client, ws)
    this.skills = new SkillsResource(client, ws)
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
  ParseError,
  ConfigurationError,
  isAmigoError,
  isNotFoundError,
  isRateLimitError,
  isAuthenticationError,
} from './core/errors.js'

export type {
  WorkspaceId,
  ApiKeyId,
  AgentId,
  PersonaId,
  SkillId,
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
export type { PaginatedList, ListParams } from './core/utils.js'
export type { RetryOptions } from './core/retry.js'

// Generated OpenAPI types — consumers can import specific schemas
export type { paths, components, operations } from './generated/api.js'
