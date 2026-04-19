import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const VOICE_SETTINGS_FIXTURE = {
  default_language: 'en',
  voice_provider: 'deepgram',
  stt_model: 'nova-2',
  tts_provider: 'elevenlabs',
  tts_voice_id: 'voice-abc123',
  silence_timeout_ms: 3000,
  max_call_duration_seconds: 1800,
  recording_enabled: true,
}

const BRANDING_FIXTURE = {
  display_name: 'Acme Health',
  logo_url: 'https://cdn.example.com/logo.png',
  primary_color: '#0066CC',
  secondary_color: '#004499',
  support_email: 'support@acme.example.com',
  support_phone: '+14155551000',
}

const OUTREACH_FIXTURE = {
  enabled: true,
  max_daily_calls: 50,
  calling_hours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
  retry_policy: { max_attempts: 3, delay_minutes: 60 },
}

const MEMORY_SETTINGS_FIXTURE = {
  enabled: true,
  retention_days: 90,
  auto_summarize: true,
}

const SECURITY_FIXTURE = {
  mfa_required: true,
  session_timeout_minutes: 60,
  ip_allowlist: ['10.0.0.0/8'],
}

const RETENTION_FIXTURE = {
  call_recordings_days: 365,
  transcripts_days: 730,
  events_days: 1095,
}

const WORKFLOWS_FIXTURE = {
  auto_escalation_enabled: true,
  escalation_timeout_seconds: 120,
  wrap_up_required: true,
}

function mockFetch(routes: Record<string, () => Response | Promise<Response>>): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), { status: 500 })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/settings/voice`]: () =>
      Response.json(VOICE_SETTINGS_FIXTURE),

    [`PUT ${BASE}/settings/voice`]: () =>
      Response.json({ ...VOICE_SETTINGS_FIXTURE, silence_timeout_ms: 5000 }),

    [`GET ${BASE}/settings/branding`]: () =>
      Response.json(BRANDING_FIXTURE),

    [`PUT ${BASE}/settings/branding`]: () =>
      Response.json({ ...BRANDING_FIXTURE, display_name: 'Acme Health Pro' }),

    [`GET ${BASE}/settings/outreach`]: () =>
      Response.json(OUTREACH_FIXTURE),

    [`PUT ${BASE}/settings/outreach`]: () =>
      Response.json({ ...OUTREACH_FIXTURE, max_daily_calls: 100 }),

    [`GET ${BASE}/settings/memory`]: () =>
      Response.json(MEMORY_SETTINGS_FIXTURE),

    [`PUT ${BASE}/settings/memory`]: () =>
      Response.json({ ...MEMORY_SETTINGS_FIXTURE, retention_days: 180 }),

    [`GET ${BASE}/settings/security`]: () =>
      Response.json(SECURITY_FIXTURE),

    [`PUT ${BASE}/settings/security`]: () =>
      Response.json({ ...SECURITY_FIXTURE, mfa_required: false }),

    [`GET ${BASE}/settings/retention`]: () =>
      Response.json(RETENTION_FIXTURE),

    [`PUT ${BASE}/settings/retention`]: () =>
      Response.json({ ...RETENTION_FIXTURE, call_recordings_days: 180 }),

    [`GET ${BASE}/settings/workflows`]: () =>
      Response.json(WORKFLOWS_FIXTURE),

    [`PUT ${BASE}/settings/workflows`]: () =>
      Response.json({ ...WORKFLOWS_FIXTURE, escalation_timeout_seconds: 60 }),
  }),
})

describe('SettingsResource', () => {
  describe('voice', () => {
    it('gets voice settings', async () => {
      const result = await client.settings.voice.get()
      expect(result.default_language).toBe('en')
      expect(result.recording_enabled).toBe(true)
      expect(result.silence_timeout_ms).toBe(3000)
    })

    it('updates voice settings', async () => {
      const result = await client.settings.voice.update({ silence_timeout_ms: 5000 } as never)
      expect(result.silence_timeout_ms).toBe(5000)
    })
  })

  describe('branding', () => {
    it('gets branding settings', async () => {
      const result = await client.settings.branding.get()
      expect(result.display_name).toBe('Acme Health')
      expect(result.primary_color).toBe('#0066CC')
    })

    it('updates branding settings', async () => {
      const result = await client.settings.branding.update({ display_name: 'Acme Health Pro' } as never)
      expect(result.display_name).toBe('Acme Health Pro')
    })
  })

  describe('outreach', () => {
    it('gets outreach settings', async () => {
      const result = await client.settings.outreach.get()
      expect(result.enabled).toBe(true)
      expect(result.max_daily_calls).toBe(50)
    })

    it('updates outreach settings', async () => {
      const result = await client.settings.outreach.update({ max_daily_calls: 100 } as never)
      expect(result.max_daily_calls).toBe(100)
    })
  })

  describe('memory', () => {
    it('gets memory settings', async () => {
      const result = await client.settings.memory.get()
      expect(result.enabled).toBe(true)
      expect(result.retention_days).toBe(90)
    })

    it('updates memory settings', async () => {
      const result = await client.settings.memory.update({ retention_days: 180 } as never)
      expect(result.retention_days).toBe(180)
    })
  })

  describe('security', () => {
    it('gets security settings', async () => {
      const result = await client.settings.security.get()
      expect(result.mfa_required).toBe(true)
      expect(result.session_timeout_minutes).toBe(60)
    })

    it('updates security settings', async () => {
      const result = await client.settings.security.update({ mfa_required: false } as never)
      expect(result.mfa_required).toBe(false)
    })
  })

  describe('retention', () => {
    it('gets retention policy', async () => {
      const result = await client.settings.retention.get()
      expect(result.call_recordings_days).toBe(365)
      expect(result.transcripts_days).toBe(730)
    })

    it('updates retention policy', async () => {
      const result = await client.settings.retention.update({ call_recordings_days: 180 } as never)
      expect(result.call_recordings_days).toBe(180)
    })
  })

  describe('workflows', () => {
    it('gets workflow settings', async () => {
      const result = await client.settings.workflows.get()
      expect(result.auto_escalation_enabled).toBe(true)
      expect(result.wrap_up_required).toBe(true)
    })

    it('updates workflow settings', async () => {
      const result = await client.settings.workflows.update({ escalation_timeout_seconds: 60 } as never)
      expect(result.escalation_timeout_seconds).toBe(60)
    })
  })
})
