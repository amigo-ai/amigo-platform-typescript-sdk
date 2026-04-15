import { http, HttpResponse, type RequestHandler } from 'msw'
import { setupServer } from 'msw/node'
import type { Agent, Skill, Trigger, Entity, PaginatedResponse } from '../src/types/api.js'

export const TEST_API_KEY = 'test-api-key-abc123'
export const TEST_WORKSPACE_ID = 'ws-test-00000000-0000-0000-0000-000000000001'
export const BASE_URL = 'https://api.platform.amigo.ai'
export const WS_BASE = `${BASE_URL}/v1/${TEST_WORKSPACE_ID}`

// --- Fixtures ---

export const fixtures = {
  agent: (): Agent => ({
    id: 'agent-00000000-0000-0000-0000-000000000001',
    workspace_id: TEST_WORKSPACE_ID,
    name: 'Test Agent',
    description: 'A test agent',
    persona_id: null,
    skill_ids: [],
    model: 'claude-sonnet-4-6',
    version: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }),

  skill: (): Skill => ({
    id: 'skill-00000000-0000-0000-0000-000000000001',
    workspace_id: TEST_WORKSPACE_ID,
    slug: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill',
    system_prompt: null,
    input_schema: { type: 'object', properties: {} },
    result_schema: null,
    model: 'claude-sonnet-4-6',
    execution_tier: 'direct',
    integration_tools: [],
    static_tools: [],
    version: 1,
    enabled: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }),

  trigger: (): Trigger => ({
    id: 'trigger-00000000-0000-0000-0000-000000000001',
    workspace_id: TEST_WORKSPACE_ID,
    name: 'Test Trigger',
    description: null,
    event_type: null,
    event_filter: null,
    action_id: 'skill-00000000-0000-0000-0000-000000000001',
    input_template: {},
    schedule: '0 13 * * 1-5',
    timezone: 'America/New_York',
    is_active: true,
    next_fire_at: '2026-04-16T17:00:00Z',
    last_fired_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }),

  entity: (): Entity => ({
    id: 'entity-00000000-0000-0000-0000-000000000001',
    workspace_id: TEST_WORKSPACE_ID,
    entity_type: 'patient',
    canonical_id: 'MRN-12345',
    properties: { name: 'Jane Doe', dob: '1980-01-01' },
    confidence: 0.95,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }),

  paginatedList: <T>(items: T[]): PaginatedResponse<T> => ({
    items,
    has_more: false,
    continuation_token: null,
  }),
}

// --- MSW server setup ---

export function createMockServer(...handlers: RequestHandler[]) {
  return setupServer(
    // Default auth/me handler
    http.get(`${BASE_URL}/v1/auth/me`, () =>
      HttpResponse.json({
        workspace_id: TEST_WORKSPACE_ID,
        key_id: 'key-001',
        name: 'Test Key',
        expires_at: '2026-12-31T00:00:00Z',
        expires_in_seconds: 86400,
      }),
    ),
    ...handlers,
  )
}

/** Verify the auth header was set correctly */
export function assertAuthHeader(request: Request): void {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${TEST_API_KEY}`) {
    throw new Error(`Expected Authorization: Bearer ${TEST_API_KEY}, got: ${auth}`)
  }
}
