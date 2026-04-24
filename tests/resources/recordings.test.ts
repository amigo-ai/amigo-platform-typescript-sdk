import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const CALL_SID = 'CA1234567890abcdef1234567890abcdef'

const URLS_FIXTURE = {
  call_sid: CALL_SID,
  inbound_url: 'https://recordings.example.com/rec-001-inbound.wav',
  outbound_url: 'https://recordings.example.com/rec-001-outbound.wav',
  metadata_url: 'https://recordings.example.com/rec-001-metadata.json',
}

const METADATA_FIXTURE = {
  call_sid: CALL_SID,
  call_start_iso: '2026-01-01T00:00:00Z',
  call_end_iso: '2026-01-01T00:03:05Z',
  duration_seconds: 185,
  direction: 'inbound' as const,
  service_id: 'agent-001',
  workspace_id: TEST_WORKSPACE_ID,
  tts_provider: 'elevenlabs',
  media_start_epoch_ms: 1735689600000,
  inbound_format: 'wav',
  inbound_sample_rate: 16000,
  inbound_size_bytes: 2960000,
  outbound_format: 'wav',
  outbound_sample_rate: 16000,
  outbound_size_bytes: 2960000,
}

const DOWNLOAD_FIXTURE = {
  data: 'binary-audio-content',
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
    [`GET ${BASE}/recordings/${CALL_SID}/urls`]: () => Response.json(URLS_FIXTURE),

    [`GET ${BASE}/recordings/${CALL_SID}/metadata`]: () => Response.json(METADATA_FIXTURE),

    [`GET ${BASE}/recordings/${CALL_SID}/download/recording.wav`]: () =>
      Response.json(DOWNLOAD_FIXTURE),
  }),
})

describe('RecordingsResource', () => {
  it('gets recording URLs', async () => {
    const result = await client.recordings.getUrls(CALL_SID)
    expect(result.call_sid).toBe(CALL_SID)
    expect(result.inbound_url).toContain('inbound')
    expect(result.outbound_url).toContain('outbound')
  })

  it('gets recording metadata', async () => {
    const result = await client.recordings.getMetadata(CALL_SID)
    expect(result.call_sid).toBe(CALL_SID)
    expect(result.duration_seconds).toBe(185)
    expect(result.inbound_sample_rate).toBe(16000)
    expect(result.inbound_format).toBe('wav')
  })

  it('downloads a recording', async () => {
    const result = await client.recordings.download(CALL_SID, 'recording.wav')
    // download returns `unknown` per the OpenAPI spec
    expect(result).toBeDefined()
  })
})
