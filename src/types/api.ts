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
  id: string
  workspace_id: string
  key_id: string
  name: string | null
  role: ApiKeyRole
  permissions: string[]
  expires_at: string
  last_used_at: string | null
  created_at: string
  updated_at: string
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
  description: string
  latest_version: number | null
  created_at: string
  updated_at: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
}

export interface UpdateAgentRequest {
  name?: string | null
  description?: string | null
}

export interface AgentIdentity {
  name: string
  role: string
  developed_by: string
  default_spoken_language: string
  relationship_to_developer: {
    ownership: string
    type: string
    conversation_visibility: string
    thought_visibility: string
  }
}

export interface AgentVoiceConfig {
  voice_id: string
  stability?: number
  similarity_boost?: number
  style?: number
}

export interface AgentVersion {
  id: string
  workspace_id: string
  agent_id: string
  version: number
  name: string
  initials: string
  identity: AgentIdentity
  voice_config: AgentVoiceConfig | null
  background: string
  behaviors: string[]
  communication_patterns: string[]
  created_at: string
  updated_at: string
}

export interface CreateAgentVersionRequest {
  name: string
  initials?: string
  identity: AgentIdentity
  voice_config?: AgentVoiceConfig | null
  background?: string
  behaviors?: string[]
  communication_patterns?: string[]
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

export interface ServiceVersionSet {
  agent_version_number: number
  context_graph_version_number: number
  llm_model_preferences: Record<string, unknown>
}

export interface ServiceTag {
  key: string
  value: string
}

export interface ServiceVoiceConfig {
  tts_model: string | null
  max_buffer_delay_ms: number | null
  eager_eot_threshold: number | null
  eot_timeout_ms: number | null
  filler_style: string | null
  filler_vocabulary: string[] | null
  backchannel_delay_ms: number | null
  max_response_sentences: number | null
  max_response_words: number | null
  barge_in_min_speech_s: number | null
  barge_in_cooldown_s: number | null
  forward_call_enabled: boolean
}

export interface Service {
  id: string
  workspace_id: string
  name: string
  description: string | null
  agent_id: string | null
  agent_name: string | null
  context_graph_id: string | null
  context_graph_name: string | null
  persona_id: string | null
  persona_name: string | null
  channel_type: string
  environment: string
  keyterms: string[]
  tags: ServiceTag[]
  is_active: boolean
  is_system: boolean
  safety_filters_enabled: boolean
  tool_capacity: number
  version_sets: Record<string, ServiceVersionSet>
  voice_config: ServiceVoiceConfig | null
  created_at: string
  updated_at: string
}

export interface CreateServiceRequest {
  name: string
  description?: string
  agent_id?: string
  context_graph_id?: string
  channel_type?: string
  keyterms?: string[]
}

export interface UpdateServiceRequest {
  name?: string
  description?: string
  agent_id?: string
  context_graph_id?: string
  is_active?: boolean
  keyterms?: string[]
  voice_config?: Partial<ServiceVoiceConfig>
}

// ---------------------------------------------------------------------------
// Context Graphs
// ---------------------------------------------------------------------------

export interface ContextGraph {
  id: string
  workspace_id: string
  name: string
  description: string | null
  latest_version: number | null
  state_count: number
  created_at: string
  updated_at: string
}

export interface CreateContextGraphRequest {
  name: string
  description?: string
}

export interface UpdateContextGraphRequest {
  name?: string
  description?: string
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
  display_name: string | null
  canonical_id: string | null
  external_ids: Record<string, string>
  state: Record<string, unknown>
  tags: string[]
  source: string | null
  confidence: number
  event_count: number
  has_projection: boolean
  first_seen_at: string | null
  last_event_at: string | null
  created_at: string
  updated_at: string
  // type-specific fields — present depending on entity_type
  name: string | null
  phone: string | null
  email: string | null
  mrn: string | null
  birth_date: string | null
  gender: string | null
  call_sid: string | null
  direction: string | null
  status: string | null
  duration_seconds: number | null
  appointment_start: string | null
  appointment_end: string | null
  appointment_status: string | null
  appointment_type: string | null
  deal_stage: string | null
  deal_amount: number | null
  domain: string | null
  industry: string | null
}

export interface CreateEntityRequest {
  entity_type: EntityType
  canonical_id?: string
  display_name?: string
  external_ids?: Record<string, string>
  state?: Record<string, unknown>
}

export interface UpdateEntityRequest {
  display_name?: string
  state?: Record<string, unknown>
  tags?: string[]
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

export type CallDirection = 'inbound' | 'outbound'

export interface Call {
  call_sid: string
  entity_id: string | null
  direction: CallDirection
  /** Phone number involved in the call */
  phone_number: string | null
  /** Caller's phone number or identifier */
  caller_id: string | null
  started_at: string
  duration_seconds: number | null
  /** Call lifecycle status — includes engine-specific values like "engage" */
  status: string
  escalation_status: string | null
  turns: number | null
  has_recording: boolean | null
  quality_score: number | null
  final_state: string | null
  completion_reason: string | null
  service_id: string | null
  source: string | null
  run_id: string | null
  parent_session_id: string | null
  fork_turn_index: number | null
}

export interface TranscriptSegment {
  speaker: 'agent' | 'customer'
  text: string
  start_seconds: number
  end_seconds: number
}

export interface ListCallsParams {
  limit?: number
  continuation_token?: number
  status?: string
  direction?: CallDirection
  service_id?: string
  /** Include test/simulation calls */
  include_simulated?: boolean
}

// ---------------------------------------------------------------------------
// Phone Numbers
// ---------------------------------------------------------------------------

export interface PhoneNumberForwarding {
  enabled: boolean
  forward_to: string | null
  should_disconnect: boolean
}

export interface PhoneNumber {
  id: string
  workspace_id: string
  phone_number: string
  display_name: string | null
  provider: string
  capabilities: string[]
  status: string
  inbound_service_id: string | null
  provider_phone_sid: string | null
  notes: string | null
  forwarding: PhoneNumberForwarding | null
  created_at: string
  updated_at: string
}

export interface ProvisionPhoneNumberRequest {
  area_code?: string
  phone_number?: string
  display_name?: string
  inbound_service_id?: string
}

export interface UpdatePhoneNumberRequest {
  display_name?: string
  inbound_service_id?: string | null
  notes?: string
  forwarding?: Partial<PhoneNumberForwarding>
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationEndpoint {
  name: string
  description: string
  method: string
  path: string
  base_url: string | null
  input_schema: Record<string, unknown>
  result_delivery: string | null
  headers: Record<string, string> | null
  body_format: string | null
}

export interface Integration {
  id: string
  workspace_id: string
  name: string
  display_name: string | null
  protocol: string
  base_url: string | null
  auth: Record<string, unknown> | null
  endpoints: IntegrationEndpoint[]
  enabled: boolean
  builtin: boolean
  created_at: string
  updated_at: string
}

export interface CreateIntegrationRequest {
  name: string
  display_name?: string
  protocol: string
  base_url?: string
  auth?: Record<string, unknown>
  endpoints?: Partial<IntegrationEndpoint>[]
}

export interface UpdateIntegrationRequest {
  display_name?: string
  base_url?: string
  auth?: Record<string, unknown>
  enabled?: boolean
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  total_calls: number
  completed_calls: number
  avg_duration_seconds: number
  completion_rate: number
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

export interface SimulationConversationTurn {
  role: string
  text: string
  emotion: string | null
}

export interface SimulationState {
  name: string
  type: string
  objective: string
  actions: Record<string, unknown>[]
  exit_conditions: Record<string, unknown>[]
  action_guidelines: string[]
  boundary_constraints: string[]
  guardrails: Record<string, unknown>[]
  tools: string[]
}

export interface SimulationSnapshot {
  current_state: SimulationState
  reachable_states: Record<string, unknown>[]
  conversation_history: SimulationConversationTurn[]
  states_visited: string[]
  state_transitions: string[][]
  total_turns: number
  tools_called: string[]
  terminal_reached: boolean
  terminal_state: string | null
}

export interface SimulationSession {
  session_id: string
  greeting: string
  is_terminal: boolean
  snapshot: SimulationSnapshot
}

export interface SimulationStepObservation {
  state_before: string
  state_after: string
  state_changed: boolean
  agent_text: string
  is_terminal: boolean
  tools_called: string[]
  empathy_tier: number
  has_pause: boolean
}

export interface SimulationStepResponse {
  observation: SimulationStepObservation
  snapshot: SimulationSnapshot
}

export interface CreateSimulationSessionRequest {
  service_id: string
  branch_name?: string
}

export interface StepSimulationSessionRequest {
  session_id: string
  caller_text: string
  emotion?: string
  valence?: number
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

export interface UsageMeter {
  name: string
  value: number
  unit: string
}

export interface UsageSummary {
  workspace_id: string
  period_start: string | null
  period_end: string | null
  meters: UsageMeter[]
  total_events: number
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
  display_name: string | null
  source_type: string
  connection_config: Record<string, unknown>
  entity_types: string[]
  field_mappings: Record<string, unknown>
  sync_strategy: string
  sync_schedule: string | null
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_event_count: number
  is_active: boolean
  is_stale: boolean
  health_status: string
  last_health_check: string | null
  discovered_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateDataSourceRequest {
  name: string
  source_type: string
  connection_config: Record<string, unknown>
  entity_types?: string[]
  sync_strategy?: string
  sync_schedule?: string
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
