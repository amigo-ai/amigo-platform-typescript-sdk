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

export const DEFAULT_BASE_URL = 'https://api.platform.amigo.ai'

export interface AmigoClientConfig {
  /**
   * Your Amigo Platform API key.
   * Create one at: Platform > Workspace Settings > API Keys
   */
  apiKey: string

  /**
   * Your workspace ID. All resource operations are scoped to this workspace.
   */
  workspaceId: string

  /**
   * Override the base URL. Defaults to https://api.platform.amigo.ai
   * Useful for pointing at a staging environment.
   */
  baseUrl?: string

  /**
   * Retry configuration for failed requests.
   * Applies exponential backoff with full jitter.
   */
  retry?: RetryOptions
}

/**
 * The main entry point for the Amigo Platform SDK.
 *
 * Instantiate once and reuse across your application.
 */
export class AmigoClient {
  /** Workspace management */
  readonly workspaces: WorkspacesResource

  /** API key management */
  readonly apiKeys: ApiKeysResource

  /** Agent management — AI agents that handle calls */
  readonly agents: AgentsResource

  /** Skill management — reusable AI capabilities */
  readonly skills: SkillsResource

  /** Service management — external service configurations */
  readonly services: ServicesResource

  /** Context graph management — conversation flow structures */
  readonly contextGraphs: ContextGraphsResource

  /** Data source management — external data connections */
  readonly dataSources: DataSourcesResource

  /** World model — entities, events, and timelines */
  readonly world: WorldResource

  /** Call records and intelligence */
  readonly calls: CallsResource

  /** Phone number provisioning and management */
  readonly phoneNumbers: PhoneNumbersResource

  /** Integration management — EHR, CRM, and other external systems */
  readonly integrations: IntegrationsResource

  /** Analytics — aggregate metrics about calls and conversions */
  readonly analytics: AnalyticsResource

  /** Simulation runs and interactive testing sessions */
  readonly simulations: SimulationsResource

  /** Workspace-level settings (voice, branding, security, outreach, etc.) */
  readonly settings: SettingsResource

  /** Billing — usage summaries and invoices */
  readonly billing: BillingResource

  /** Agent Memory — structured long-term memory for entities */
  readonly memory: MemoryResource

  constructor(config: AmigoClientConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new ConfigurationError('apiKey is required and must be a non-empty string')
    }
    if (!config.workspaceId || typeof config.workspaceId !== 'string') {
      throw new ConfigurationError('workspaceId is required and must be a non-empty string')
    }

    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

    const rc = {
      apiKey: config.apiKey,
      baseUrl,
      workspaceId: config.workspaceId,
    }

    this.workspaces = new WorkspacesResource({ apiKey: config.apiKey, baseUrl })
    this.apiKeys = new ApiKeysResource(rc)
    this.agents = new AgentsResource(rc)
    this.skills = new SkillsResource(rc)
    this.services = new ServicesResource(rc)
    this.contextGraphs = new ContextGraphsResource(rc)
    this.dataSources = new DataSourcesResource(rc)
    this.world = new WorldResource(rc)
    this.calls = new CallsResource(rc)
    this.phoneNumbers = new PhoneNumbersResource(rc)
    this.integrations = new IntegrationsResource(rc)
    this.analytics = new AnalyticsResource(rc)
    this.simulations = new SimulationsResource(rc)
    this.settings = new SettingsResource(rc)
    this.billing = new BillingResource(rc)
    this.memory = new MemoryResource(rc)
  }
}

// --- Public exports ---

export type { AmigoClientConfig as AmigoConfig }

// Errors
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

// Branded types
export type {
  WorkspaceId,
  ApiKeyId,
  AgentId,
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
  DataSourceId,
} from './core/branded-types.js'

export {
  workspaceId,
  apiKeyId,
  agentId,
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
  dataSourceId,
} from './core/branded-types.js'

// Utilities
export { paginate } from './core/utils.js'
export type { PaginatedList, ListParams } from './core/utils.js'
export type { RetryOptions } from './core/retry.js'

// Resource-specific types
export type {
  VoiceSettings,
  BrandingSettings,
  BrandingConfig,
  OutreachSettings,
  OutreachRule,
  MemorySettings,
  MemoryDimensionConfig,
  SecuritySettings,
  RetentionSettings,
  WorkflowSettings,
  WorkflowConfig,
} from './resources/settings.js'

export type { UpdateDataSourceRequest } from './resources/data-sources.js'

export type {
  ContextGraphVersion,
} from './resources/context-graphs.js'

export type {
  EntityRelationship,
  EntityGraph,
  EntityProvenance,
  EntityLineage,
  SyncEvent,
  SyncStatusBySink,
  SourceBreakdown,
  EntityStats,
  SearchEntitiesParams,
} from './resources/world.js'

export type {
  SimulationIntelligence,
} from './resources/simulations.js'

export type {
  CallDetail,
  CallIntelligence,
  CallTranscriptSegment,
  CallBenchmarks,
} from './resources/calls.js'

export type {
  MetricWithDelta,
  AnalyticsDashboard,
  CallAnalytics,
  AgentAnalytics,
  AgentAnalyticsResponse,
  CallQualityMetrics,
  EmotionTrends,
  LatencyMetrics,
  ToolPerformance,
  DataQualityMetrics,
  AdvancedCallStats,
  CallComparison,
  AnalyticsQueryParams,
} from './resources/analytics.js'

export type {
  DimensionScore,
  EntityDimensionsResponse,
  MemoryFact,
  EntityFactsResponse,
  DimensionAnalytics,
  MemoryAnalyticsResponse,
} from './resources/memory.js'

// API types
export type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  ApiKey,
  ApiKeyRole,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  RotateApiKeyResponse,
  AuthMeResponse,
  Agent,
  AgentVersion,
  AgentIdentity,
  AgentVoiceConfig,
  CreateAgentRequest,
  UpdateAgentRequest,
  CreateAgentVersionRequest,
  Skill,
  ExecutionTier,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillTestRequest,
  SkillTestResponse,
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ContextGraph,
  CreateContextGraphRequest,
  UpdateContextGraphRequest,
  DataSource,
  CreateDataSourceRequest,
  Entity,
  EntityType,
  WorldEvent,
  TimelineEntry,
  CreateEntityRequest,
  UpdateEntityRequest,
  EmitEventRequest,
  MergeEntitiesRequest,
  Call,
  CallDirection,
  ListCallsParams,
  PhoneNumber,
  PhoneNumberForwarding,
  ProvisionPhoneNumberRequest,
  UpdatePhoneNumberRequest,
  Integration,
  IntegrationEndpoint,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  AgentPerformance,
  UsageMeter,
  ServiceVersionSet,
  ServiceTag,
  ServiceVoiceConfig,
  SimulationSession,
  SimulationSnapshot,
  SimulationStepResponse,
  SimulationStepObservation,
  CreateSimulationSessionRequest,
  UsageSummary,
  Invoice,
  PaginatedResponse,
} from './types/api.js'
