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
import { TriggersResource } from './resources/triggers.js'
import { WorldResource } from './resources/world.js'
import { CallsResource } from './resources/calls.js'
import { PhoneNumbersResource } from './resources/phone-numbers.js'
import { IntegrationsResource } from './resources/integrations.js'
import { AnalyticsResource } from './resources/analytics.js'
import { SurfacesResource } from './resources/surfaces.js'
import { OperatorsResource } from './resources/operators.js'
import { SimulationsResource } from './resources/simulations.js'
import { ScribeResource } from './resources/scribe.js'
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
  /** Workspace management (create, list, update workspaces) */
  readonly workspaces: WorkspacesResource

  /** API key management (create, rotate, revoke keys) */
  readonly apiKeys: ApiKeysResource

  /** Agent management (AI agents that handle calls) */
  readonly agents: AgentsResource

  /** Skill management (reusable AI capabilities for agents) */
  readonly skills: SkillsResource

  /** Trigger management (scheduled + event-driven automation) */
  readonly triggers: TriggersResource

  /** World model (entities, events, and entity timelines) */
  readonly world: WorldResource

  /** Call records and intelligence */
  readonly calls: CallsResource

  /** Phone number provisioning and management */
  readonly phoneNumbers: PhoneNumbersResource

  /** Integration management (EHR, CRM, and other external systems) */
  readonly integrations: IntegrationsResource

  /** Analytics and aggregate metrics */
  readonly analytics: AnalyticsResource

  /** Surface management (patient-facing forms, calendars, chat) */
  readonly surfaces: SurfacesResource

  /** Operator management (human agents who monitor calls) */
  readonly operators: OperatorsResource

  /** Simulation runs and interactive testing sessions */
  readonly simulations: SimulationsResource

  /** Scribe — AI clinical documentation */
  readonly scribe: ScribeResource

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

    const resourceConfig = {
      apiKey: config.apiKey,
      baseUrl,
      workspaceId: config.workspaceId,
    }

    const workspacesConfig = {
      apiKey: config.apiKey,
      baseUrl,
    }

    this.workspaces = new WorkspacesResource(workspacesConfig)
    this.apiKeys = new ApiKeysResource(resourceConfig)
    this.agents = new AgentsResource(resourceConfig)
    this.skills = new SkillsResource(resourceConfig)
    this.triggers = new TriggersResource(resourceConfig)
    this.world = new WorldResource(resourceConfig)
    this.calls = new CallsResource(resourceConfig)
    this.phoneNumbers = new PhoneNumbersResource(resourceConfig)
    this.integrations = new IntegrationsResource(resourceConfig)
    this.analytics = new AnalyticsResource(resourceConfig)
    this.surfaces = new SurfacesResource(resourceConfig)
    this.operators = new OperatorsResource(resourceConfig)
    this.simulations = new SimulationsResource(resourceConfig)
    this.scribe = new ScribeResource(resourceConfig)
    this.billing = new BillingResource(resourceConfig)
  }
}

// --- Public exports ---

// Client
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

// Branded types + constructors
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

// API types
export type {
  // Workspace
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  // API Keys
  ApiKey,
  ApiKeyRole,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  RotateApiKeyResponse,
  AuthMeResponse,
  // Agents
  Agent,
  AgentVersion,
  CreateAgentRequest,
  UpdateAgentRequest,
  // Personas
  Persona,
  CreatePersonaRequest,
  UpdatePersonaRequest,
  // Skills
  Skill,
  ExecutionTier,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillTestRequest,
  SkillTestResponse,
  // Triggers
  Trigger,
  TriggerRun,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  // World
  Entity,
  EntityType,
  WorldEvent,
  TimelineEntry,
  CreateEntityRequest,
  UpdateEntityRequest,
  EmitEventRequest,
  MergeEntitiesRequest,
  // Calls
  Call,
  CallDetail,
  CallStatus,
  CallDirection,
  CallIntelligence,
  TranscriptSegment,
  // Phone numbers
  PhoneNumber,
  ProvisionPhoneNumberRequest,
  UpdatePhoneNumberRequest,
  // Integrations
  Integration,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  // Analytics
  AnalyticsSummary,
  DailyAnalyticsEntry,
  AgentPerformance,
  // Surfaces
  Surface,
  CreateSurfaceRequest,
  UpdateSurfaceRequest,
  // Operators
  Operator,
  CreateOperatorRequest,
  UpdateOperatorRequest,
  OperatorDashboard,
  // Simulations
  SimulationRun,
  SimulationSession,
  CreateSimulationRunRequest,
  CreateSimulationSessionRequest,
  // Scribe
  ScribeSession,
  ScribeSessionStatus,
  CreateScribeSessionRequest,
  // Billing
  UsageSummary,
  Invoice,
  // Data Sources
  DataSource,
  CreateDataSourceRequest,
  // Functions
  PlatformFunction,
  CreateFunctionRequest,
  // Shared
  PaginatedResponse,
} from './types/api.js'
