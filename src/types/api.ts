/**
 * Amigo Platform API types.
 *
 * These types define the shape of all API requests and responses.
 * They are organized to match the platform-api OpenAPI schema at:
 *   GET https://api.platform.amigo.ai/v1/openapi.json
 *
 * TODO: Auto-generate this file by running:
 *   npx openapi-typescript https://api.platform.amigo.ai/v1/openapi.json -o src/types/api.ts
 */

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[]
  has_more: boolean
  continuation_token: number | null
}

export interface ErrorResponse {
  error_code: string
  message: string
  detail: string
  request_id: string
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  updated_at: string
}

export interface CreateWorkspaceRequest {
  name: string
  slug: string
}

export interface UpdateWorkspaceRequest {
  name?: string
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export type ApiKeyRole = 'owner' | 'admin' | 'member' | 'operator' | 'viewer'

export interface ApiKey {
  key_id: string
  name: string | null
  role: ApiKeyRole
  permissions: string[]
  expires_at: string
  created_at: string
  last_used_at: string | null
}

export interface CreateApiKeyRequest {
  name?: string
  duration_days: number
  role: ApiKeyRole
  permissions?: string[]
}

export interface CreateApiKeyResponse extends ApiKey {
  /** The raw API key value — only returned at creation time */
  api_key: string
}

export interface RotateApiKeyResponse {
  key_id: string
  api_key: string
  expires_at: string
}

export interface AuthMeResponse {
  workspace_id: string
  key_id: string
  name: string | null
  expires_at: string
  expires_in_seconds: number
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export interface Agent {
  id: string
  workspace_id: string
  name: string
  description: string | null
  persona_id: string | null
  skill_ids: string[]
  model: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
  persona_id?: string
  skill_ids?: string[]
  model?: string
}

export interface UpdateAgentRequest {
  name?: string
  description?: string
  persona_id?: string
  skill_ids?: string[]
  model?: string
  is_active?: boolean
}

export interface AgentVersion {
  agent_id: string
  version: number
  config_snapshot: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export interface Persona {
  id: string
  workspace_id: string
  name: string
  description: string | null
  voice_id: string | null
  system_prompt: string | null
  created_at: string
  updated_at: string
}

export interface CreatePersonaRequest {
  name: string
  description?: string
  voice_id?: string
  system_prompt?: string
}

export interface UpdatePersonaRequest {
  name?: string
  description?: string
  voice_id?: string
  system_prompt?: string
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export type ExecutionTier =
  | 'direct'
  | 'orchestrated'
  | 'autonomous'
  | 'browser'
  | 'computer_use'

export interface IntegrationTool {
  integration: string
  endpoint: string
}

export interface StaticTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface Skill {
  id: string
  workspace_id: string
  slug: string
  name: string
  description: string
  system_prompt: string | null
  input_schema: Record<string, unknown>
  result_schema: Record<string, unknown> | null
  model: string
  execution_tier: ExecutionTier
  integration_tools: IntegrationTool[]
  static_tools: StaticTool[]
  version: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateSkillRequest {
  slug: string
  name: string
  description: string
  system_prompt?: string
  input_schema: Record<string, unknown>
  result_schema?: Record<string, unknown>
  model?: string
  execution_tier?: ExecutionTier
  integration_tools?: IntegrationTool[]
  static_tools?: StaticTool[]
  enabled?: boolean
}

export interface UpdateSkillRequest {
  name?: string
  description?: string
  system_prompt?: string
  input_schema?: Record<string, unknown>
  result_schema?: Record<string, unknown>
  model?: string
  execution_tier?: ExecutionTier
  integration_tools?: IntegrationTool[]
  static_tools?: StaticTool[]
  enabled?: boolean
}

export interface SkillTestRequest {
  input: Record<string, unknown>
}

export interface SkillTestResponse {
  success: boolean
  output: Record<string, unknown> | null
  error: string | null
  duration_ms: number
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface Service {
  id: string
  workspace_id: string
  name: string
  description: string | null
  type: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateServiceRequest {
  name: string
  description?: string
  type: string
  config?: Record<string, unknown>
}

export interface UpdateServiceRequest {
  name?: string
  description?: string
  config?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Context Graphs
// ---------------------------------------------------------------------------

export interface ContextGraph {
  id: string
  workspace_id: string
  name: string
  description: string | null
  schema: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export interface CreateContextGraphRequest {
  name: string
  description?: string
  schema: Record<string, unknown>
}

export interface UpdateContextGraphRequest {
  name?: string
  description?: string
  schema?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export interface Trigger {
  id: string
  workspace_id: string
  name: string
  description: string | null
  event_type: string | null
  event_filter: Record<string, unknown> | null
  action_id: string
  input_template: Record<string, unknown>
  schedule: string | null
  timezone: string
  is_active: boolean
  next_fire_at: string | null
  last_fired_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTriggerRequest {
  name: string
  description?: string
  event_type?: string
  event_filter?: Record<string, unknown>
  action_id: string
  input_template?: Record<string, unknown>
  schedule?: string
  timezone?: string
}

export interface UpdateTriggerRequest {
  name?: string
  description?: string
  event_filter?: Record<string, unknown>
  input_template?: Record<string, unknown>
  schedule?: string
  timezone?: string
}

export interface TriggerRun {
  id: string
  trigger_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  started_at: string
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// World Model — Entities & Events
// ---------------------------------------------------------------------------

export type EntityType =
  | 'patient'
  | 'contact'
  | 'lead'
  | 'provider'
  | 'organization'
  | 'call'
  | 'appointment'
  | string

export interface Entity {
  id: string
  workspace_id: string
  entity_type: EntityType
  canonical_id: string | null
  properties: Record<string, unknown>
  confidence: number
  created_at: string
  updated_at: string
}

export interface CreateEntityRequest {
  entity_type: EntityType
  canonical_id?: string
  properties?: Record<string, unknown>
  confidence?: number
}

export interface UpdateEntityRequest {
  properties?: Record<string, unknown>
  confidence?: number
}

export interface WorldEvent {
  id: string
  workspace_id: string
  entity_id: string
  event_type: string
  source: string
  data: Record<string, unknown>
  confidence: number
  derived_from: string | null
  created_at: string
}

export interface EmitEventRequest {
  entity_id: string
  event_type: string
  source?: string
  data?: Record<string, unknown>
  confidence?: number
  derived_from?: string
}

export interface TimelineEntry {
  event: WorldEvent
  entity_snapshot: Entity
}

export interface SimilarEntitiesResponse {
  entities: Array<{ entity: Entity; score: number }>
}

export interface MergeEntitiesRequest {
  primary_entity_id: string
  secondary_entity_ids: string[]
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy'
export type CallDirection = 'inbound' | 'outbound'

export interface Call {
  id: string
  workspace_id: string
  call_sid: string
  direction: CallDirection
  status: CallStatus
  from_number: string
  to_number: string
  duration_seconds: number | null
  started_at: string
  ended_at: string | null
  agent_id: string | null
  entity_id: string | null
  recording_url: string | null
  created_at: string
}

export interface CallDetail extends Call {
  intelligence: CallIntelligence | null
  transcript: TranscriptSegment[]
}

export interface CallIntelligence {
  summary: string | null
  sentiment: string | null
  key_moments: KeyMoment[]
  action_items: string[]
  outcomes: string[]
}

export interface KeyMoment {
  timestamp_seconds: number
  type: string
  description: string
}

export interface TranscriptSegment {
  speaker: 'agent' | 'customer'
  text: string
  start_seconds: number
  end_seconds: number
}

export interface CallVolumeResponse {
  data: Array<{ date: string; count: number }>
}

export interface ListCallsParams {
  limit?: number
  continuation_token?: number
  status?: CallStatus
  direction?: CallDirection
  from_number?: string
  to_number?: string
  agent_id?: string
  start_date?: string
  end_date?: string
}

// ---------------------------------------------------------------------------
// Phone Numbers
// ---------------------------------------------------------------------------

export interface PhoneNumber {
  id: string
  workspace_id: string
  phone_number: string
  friendly_name: string | null
  capabilities: string[]
  agent_id: string | null
  is_active: boolean
  provisioned_at: string
  created_at: string
  updated_at: string
}

export interface ProvisionPhoneNumberRequest {
  area_code?: string
  phone_number?: string
  friendly_name?: string
  agent_id?: string
}

export interface UpdatePhoneNumberRequest {
  friendly_name?: string
  agent_id?: string
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface Integration {
  id: string
  workspace_id: string
  name: string
  type: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  config: Record<string, unknown>
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateIntegrationRequest {
  name: string
  type: string
  config: Record<string, unknown>
}

export interface UpdateIntegrationRequest {
  name?: string
  config?: Record<string, unknown>
}

export interface IntegrationTestResponse {
  success: boolean
  message: string
  latency_ms: number
}

export interface IntegrationSyncResponse {
  job_id: string
  status: string
  message: string
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  total_calls: number
  total_duration_seconds: number
  avg_duration_seconds: number
  answer_rate: number
  conversion_rate: number
  period_start: string
  period_end: string
}

export interface DailyAnalyticsEntry {
  date: string
  calls: number
  duration_seconds: number
  conversions: number
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  calls: number
  avg_duration_seconds: number
  conversion_rate: number
  sentiment_score: number | null
}

export interface AnalyticsQueryParams {
  start_date?: string
  end_date?: string
  agent_id?: string
  granularity?: 'day' | 'week' | 'month'
}

// ---------------------------------------------------------------------------
// Surfaces (Patient-facing forms + flows)
// ---------------------------------------------------------------------------

export interface Surface {
  id: string
  workspace_id: string
  name: string
  slug: string
  type: 'form' | 'calendar' | 'chat' | 'survey'
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSurfaceRequest {
  name: string
  slug: string
  type: 'form' | 'calendar' | 'chat' | 'survey'
  config?: Record<string, unknown>
}

export interface UpdateSurfaceRequest {
  name?: string
  config?: Record<string, unknown>
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

export interface Operator {
  id: string
  workspace_id: string
  name: string
  email: string
  role: string
  status: 'available' | 'busy' | 'offline'
  created_at: string
  updated_at: string
}

export interface CreateOperatorRequest {
  name: string
  email: string
  role?: string
}

export interface UpdateOperatorRequest {
  name?: string
  email?: string
  role?: string
  status?: 'available' | 'busy' | 'offline'
}

export interface OperatorDashboard {
  active_calls: number
  queue_depth: number
  avg_wait_seconds: number
  operators_available: number
}

// ---------------------------------------------------------------------------
// Simulations
// ---------------------------------------------------------------------------

export interface SimulationRun {
  id: string
  workspace_id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  config: Record<string, unknown>
  results: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface CreateSimulationRunRequest {
  name: string
  config: Record<string, unknown>
}

export interface SimulationSession {
  id: string
  workspace_id: string
  agent_id: string
  status: 'active' | 'completed' | 'abandoned'
  messages: SimulationMessage[]
  created_at: string
  updated_at: string
}

export interface SimulationMessage {
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export interface CreateSimulationSessionRequest {
  agent_id: string
  initial_message?: string
}

export interface StepSimulationSessionRequest {
  session_id: string
  message: string
}

// ---------------------------------------------------------------------------
// Scribe
// ---------------------------------------------------------------------------

export type ScribeSessionStatus = 'recording' | 'processing' | 'completed' | 'failed'

export interface ScribeSession {
  id: string
  workspace_id: string
  status: ScribeSessionStatus
  transcript: string | null
  summary: string | null
  note: string | null
  duration_seconds: number | null
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface CreateScribeSessionRequest {
  provider_id?: string
  patient_id?: string
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export interface UsageSummary {
  period_start: string
  period_end: string
  call_minutes: number
  api_requests: number
  storage_gb: number
  total_cost_cents: number
}

export interface Invoice {
  id: string
  workspace_id: string
  amount_cents: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void'
  period_start: string
  period_end: string
  created_at: string
  paid_at: string | null
}

// ---------------------------------------------------------------------------
// Data Sources
// ---------------------------------------------------------------------------

export interface DataSource {
  id: string
  workspace_id: string
  name: string
  type: string
  connection_config: Record<string, unknown>
  status: 'active' | 'inactive' | 'error'
  created_at: string
  updated_at: string
}

export interface CreateDataSourceRequest {
  name: string
  type: string
  connection_config: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Functions (UC Function Tools)
// ---------------------------------------------------------------------------

export interface PlatformFunction {
  id: string
  workspace_id: string
  name: string
  description: string
  input_schema: Record<string, unknown>
  implementation: string
  version: number
  created_at: string
  updated_at: string
}

export interface CreateFunctionRequest {
  name: string
  description: string
  input_schema: Record<string, unknown>
  implementation: string
}

// ---------------------------------------------------------------------------
// Path map (used by openapi-fetch)
// The full path map is defined here so openapi-fetch can provide type safety.
// Extend as needed — in production, generate this from the OpenAPI spec.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface paths {}
