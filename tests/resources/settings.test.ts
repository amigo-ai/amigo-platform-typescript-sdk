import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const VOICE_SETTINGS_FIXTURE = {
  language: 'en',
  post_call_analysis_enabled: true,
  correction_categories: [],
  keyterms: [],
  sensitive_topics: [],
  transcript_correction_enabled: false,
  voice_id: 'voice-abc123',
  pronunciation_dict_id: null,
  speed: null,
  tone: null,
  volume: null,
}

const BRANDING_FIXTURE = {
  branding: {
    primary_color: '#0066CC',
    background_color: '#FFFFFF',
    logo_url: 'https://cdn.example.com/logo.png',
    font_family: null,
  },
}

const OUTREACH_FIXTURE = {
  rules: [{ name: 'Appointment Reminders', schedule: '0 9 * * 1-5' }],
  data_templates: [{ name: 'reminder', fields: ['patient_name', 'appointment_date'] }],
}

const MEMORY_SETTINGS_FIXTURE = {
  backfill_requested: false,
  dimensions: [{ name: 'preferences', enabled: true }],
}

const SECURITY_FIXTURE = {
  voice_auth_enabled: true,
}

const RETENTION_FIXTURE = {
  call_recordings_days: 365,
  call_transcripts_days: 730,
  world_events_days: 1095,
  audit_log_days: 365,
  phi_data_days: 2555,
  legal_hold: false,
  legal_hold_reason: null,
}

const WORKFLOWS_FIXTURE = {
  workflows: [{ name: 'escalation', enabled: true }],
}

function mockFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    let url: string
    let method: string
    if (input instanceof Request) {
      url = input.url
      method = input.method.toUpperCase()
    } else {
      url = typeof input === 'string' ? input : input.toString()
      method = (init?.method ?? 'GET').toUpperCase()
    }
    const pathname = new URL(url).pathname
    for (const [pattern, handler] of Object.entries(routes)) {
      const [pMethod, ...pPathParts] = pattern.split(' ')
      if (pMethod === method && pPathParts.join(' ') === pathname) return handler()
    }
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/settings/voice`]: () => Response.json(VOICE_SETTINGS_FIXTURE),

    [`PUT ${BASE}/settings/voice`]: () =>
      Response.json({ ...VOICE_SETTINGS_FIXTURE, language: 'es' }),

    [`GET ${BASE}/settings/branding`]: () => Response.json(BRANDING_FIXTURE),

    [`PUT ${BASE}/settings/branding`]: () =>
      Response.json({ branding: { ...BRANDING_FIXTURE.branding, primary_color: '#FF0000' } }),

    [`GET ${BASE}/settings/outreach`]: () => Response.json(OUTREACH_FIXTURE),

    [`PUT ${BASE}/settings/outreach`]: () =>
      Response.json({
        ...OUTREACH_FIXTURE,
        rules: [...OUTREACH_FIXTURE.rules, { name: 'Follow-up', schedule: '0 14 * * 1-5' }],
      }),

    [`GET ${BASE}/settings/memory`]: () => Response.json(MEMORY_SETTINGS_FIXTURE),

    [`PUT ${BASE}/settings/memory`]: () =>
      Response.json({ ...MEMORY_SETTINGS_FIXTURE, backfill_requested: true }),

    [`GET ${BASE}/settings/security`]: () => Response.json(SECURITY_FIXTURE),

    [`PUT ${BASE}/settings/security`]: () => Response.json({ voice_auth_enabled: false }),

    [`GET ${BASE}/settings/retention`]: () => Response.json(RETENTION_FIXTURE),

    [`PUT ${BASE}/settings/retention`]: () =>
      Response.json({ ...RETENTION_FIXTURE, call_recordings_days: 180 }),

    [`GET ${BASE}/settings/workflows`]: () => Response.json(WORKFLOWS_FIXTURE),

    [`PUT ${BASE}/settings/workflows`]: () =>
      Response.json({
        workflows: [
          { name: 'escalation', enabled: true },
          { name: 'wrap-up', enabled: true },
        ],
      }),
  }),
})

describe('SettingsResource', () => {
  describe('voice', () => {
    it('gets voice settings', async () => {
      const result = await client.settings.voice.get()
      expect(result.language).toBe('en')
      expect(result.post_call_analysis_enabled).toBe(true)
    })

    it('updates voice settings', async () => {
      const result = await client.settings.voice.update({ language: 'es' } as never)
      expect(result.language).toBe('es')
    })
  })

  describe('branding', () => {
    it('gets branding settings', async () => {
      const result = await client.settings.branding.get()
      expect(result.branding.primary_color).toBe('#0066CC')
    })

    it('updates branding settings', async () => {
      const result = await client.settings.branding.update({
        branding: { primary_color: '#FF0000' },
      } as never)
      expect(result.branding.primary_color).toBe('#FF0000')
    })
  })

  describe('outreach', () => {
    it('gets outreach settings', async () => {
      const result = await client.settings.outreach.get()
      expect(result.rules).toHaveLength(1)
      expect(result.data_templates).toHaveLength(1)
    })

    it('updates outreach settings', async () => {
      const result = await client.settings.outreach.update({ rules: [] } as never)
      expect(result.rules).toHaveLength(2)
    })
  })

  describe('memory', () => {
    it('gets memory settings', async () => {
      const result = await client.settings.memory.get()
      expect(result.backfill_requested).toBe(false)
      expect(result.dimensions).toHaveLength(1)
    })

    it('updates memory settings', async () => {
      const result = await client.settings.memory.update({ backfill_requested: true } as never)
      expect(result.backfill_requested).toBe(true)
    })
  })

  describe('security', () => {
    it('gets security settings', async () => {
      const result = await client.settings.security.get()
      expect(result.voice_auth_enabled).toBe(true)
    })

    it('updates security settings', async () => {
      const result = await client.settings.security.update({ voice_auth_enabled: false } as never)
      expect(result.voice_auth_enabled).toBe(false)
    })
  })

  describe('retention', () => {
    it('gets retention policy', async () => {
      const result = await client.settings.retention.get()
      expect(result.call_recordings_days).toBe(365)
      expect(result.call_transcripts_days).toBe(730)
    })

    it('updates retention policy', async () => {
      const result = await client.settings.retention.update({ call_recordings_days: 180 } as never)
      expect(result.call_recordings_days).toBe(180)
    })
  })

  describe('workflows', () => {
    it('gets workflow settings', async () => {
      const result = await client.settings.workflows.get()
      expect(result.workflows).toHaveLength(1)
    })

    it('updates workflow settings', async () => {
      const result = await client.settings.workflows.update({ workflows: [] } as never)
      expect(result.workflows).toHaveLength(2)
    })
  })
})
