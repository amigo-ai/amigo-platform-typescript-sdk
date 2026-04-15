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
import { PersonasResource } from './resources/personas.js'
import { SkillsResource } from './resources/skills.js'
import { ServicesResource } from './resources/services.js'
import { ContextGraphsResource } from './resources/context-graphs.js'
import { FunctionsResource } from './resources/functions.js'
import { DataSourcesResource } from './resources/data-sources.js'
import { TriggersResource } from './resources/triggers.js'
import { WorldResource } from './resources/world.js'
import { CallsResource } from './resources/calls.js'
import { RecordingsResource } from './resources/recordings.js'
import { PhoneNumbersResource } from './resources/phone-numbers.js'
import { IntegrationsResource } from './resources/integrations.js'
import { AnalyticsResource } from './resources/analytics.js'
import { InsightsResource } from './resources/insights.js'
import { SurfacesResource } from './resources/surfaces.js'
import { OperatorsResource } from './resources/operators.js'
import { SimulationsResource } from './resources/simulations.js'
import { ScribeResource } from './resources/scribe.js'
import { AuditResource } from './resources/audit.js'
import { QueryResource } from './resources/query.js'
import { SettingsResource } from './resources/settings.js'
import { BillingResource } from './resources/billing.js'

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

  /** Persona management — voice and personality configurations */
  readonly personas: PersonasResource

  /** Skill management — reusable AI capabilities */
  readonly skills: SkillsResource

  /** Service management — external service configurations */
  readonly services: ServicesResource

  /** Context graph management — conversation flow structures */
  readonly contextGraphs: ContextGraphsResource

  /** Custom function management — user-defined tool implementations */
  readonly functions: FunctionsResource

  /** Data source management — external data connections */
  readonly dataSources: DataSourcesResource

  /** Trigger management — scheduled and event-driven automation */
  readonly triggers: TriggersResource

  /** World model — entities, events, and timelines */
  readonly world: WorldResource

  /** Call records and intelligence */
  readonly calls: CallsResource

  /** Call recordings — access and manage recorded calls */
  readonly recordings: RecordingsResource

  /** Phone number provisioning and management */
  readonly phoneNumbers: PhoneNumbersResource

  /** Integration management — EHR, CRM, and other external systems */
  readonly integrations: IntegrationsResource

  /** Analytics — aggregate metrics about calls and conversions */
  readonly analytics: AnalyticsResource

  /** Insights — AI-generated summaries, trends, and research */
  readonly insights: InsightsResource

  /** Surface management — patient-facing forms, calendars, and chat */
  readonly surfaces: SurfacesResource

  /** Operator management — human agents who monitor calls */
  readonly operators: OperatorsResource

  /** Simulation runs and interactive testing sessions */
  readonly simulations: SimulationsResource

  /** Scribe — AI clinical documentation */
  readonly scribe: ScribeResource

  /** Audit log — immutable record of workspace actions */
  readonly audit: AuditResource

  /** Query — SQL and aggregate queries against workspace data */
  readonly query: QueryResource

  /** Workspace-level settings (voice, branding, security, outreach, etc.) */
  readonly settings: SettingsResource

  /** Billing — usage summaries and invoices */
  readonly billing: BillingResource

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
    this.personas = new PersonasResource(rc)
    this.skills = new SkillsResource(rc)
    this.services = new ServicesResource(rc)
    this.contextGraphs = new ContextGraphsResource(rc)
    this.functions = new FunctionsResource(rc)
    this.dataSources = new DataSourcesResource(rc)
    this.triggers = new TriggersResource(rc)
    this.world = new WorldResource(rc)
    this.calls = new CallsResource(rc)
    this.recordings = new RecordingsResource(rc)
    this.phoneNumbers = new PhoneNumbersResource(rc)
    this.integrations = new IntegrationsResource(rc)
    this.analytics = new AnalyticsResource(rc)
    this.insights = new InsightsResource(rc)
    this.surfaces = new SurfacesResource(rc)
    this.operators = new OperatorsResource(rc)
    this.simulations = new SimulationsResource(rc)
    this.scribe = new ScribeResource(rc)
    this.audit = new AuditResource(rc)
    this.query = new QueryResource(rc)
    this.settings = new SettingsResource(rc)
    this.billing = new BillingResource(rc)
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
  PersonaId,
  SkillId,
  ServiceId,
  ContextGraphId,
  CallId,
  PhoneNumberId,
  IntegrationId,
  EntityId,
  EventId,
  SurfaceId,
  OperatorId,
  TriggerId,
  SimulationRunId,
  SimulationSessionId,
  ScribeSessionId,
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
  surfaceId,
  operatorId,
  triggerId,
  simulationRunId,
  simulationSessionId,
  scribeSessionId,
  functionId,
  dataSourceId,
} from './core/branded-types.js'

// Utilities
export { paginate } from './core/utils.js'
export type { PaginatedList, ListParams } from './core/utils.js'
export type { RetryOptions } from './core/retry.js'

// Resource-specific types (new resources)
export type {
  Recording,
  ListRecordingsParams,
} from './resources/recordings.js'

export type {
  InsightsSummary,
  InsightsTrendsResponse,
  ResearchRequest,
  ResearchResponse,
} from './resources/insights.js'

export type {
  AuditLogEntry,
  ListAuditLogParams,
} from './resources/audit.js'

export type {
  SqlQueryRequest,
  SqlQueryResponse,
  AggregateQueryRequest,
  AggregateQueryResponse,
} from './resources/query.js'

export type {
  VoiceSettings,
  BrandingSettings,
  OutreachSettings,
  MemorySettings,
  SecuritySettings,
  BehaviorSettings,
  RetentionSettings,
  WorkflowSettings,
} from './resources/settings.js'

export type { UpdateFunctionRequest } from './resources/functions.js'
export type { UpdateDataSourceRequest } from './resources/data-sources.js'

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
  CreateAgentRequest,
  UpdateAgentRequest,
  Persona,
  CreatePersonaRequest,
  UpdatePersonaRequest,
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
  PlatformFunction,
  CreateFunctionRequest,
  DataSource,
  CreateDataSourceRequest,
  Trigger,
  TriggerRun,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  Entity,
  EntityType,
  WorldEvent,
  TimelineEntry,
  CreateEntityRequest,
  UpdateEntityRequest,
  EmitEventRequest,
  MergeEntitiesRequest,
  Call,
  CallDetail,
  CallStatus,
  CallDirection,
  CallIntelligence,
  TranscriptSegment,
  PhoneNumber,
  ProvisionPhoneNumberRequest,
  UpdatePhoneNumberRequest,
  Integration,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  AnalyticsSummary,
  DailyAnalyticsEntry,
  AgentPerformance,
  Surface,
  CreateSurfaceRequest,
  UpdateSurfaceRequest,
  Operator,
  CreateOperatorRequest,
  UpdateOperatorRequest,
  OperatorDashboard,
  SimulationRun,
  SimulationSession,
  CreateSimulationRunRequest,
  CreateSimulationSessionRequest,
  ScribeSession,
  ScribeSessionStatus,
  CreateScribeSessionRequest,
  UsageSummary,
  Invoice,
  PaginatedResponse,
} from './types/api.js'
