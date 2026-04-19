import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const CALL_SID = 'CA1234567890abcdef1234567890abcdef'

const URLS_FIXTURE = {
  call_sid: CALL_SID,
  recording_url: 'https://recordings.example.com/rec-001.wav',
  stereo_url: 'https://recordings.example.com/rec-001-stereo.wav',
  expires_at: '2026-01-02T00:00:00Z',
}

const METADATA_FIXTURE = {
  call_sid: CALL_SID,
  duration_seconds: 185,
  channels: 2,
  sample_rate: 16000,
  format: 'wav',
  size_bytes: 5920000,
  created_at: '2026-01-01T00:00:00Z',
}

const DOWNLOAD_FIXTURE = {
  call_sid: CALL_SID,
  filename: 'recording.wav',
  url: 'https://recordings.example.com/download/rec-001.wav',
  content_type: 'audio/wav',
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
    [`GET ${BASE}/recordings/${CALL_SID}/urls`]: () =>
      Response.json(URLS_FIXTURE),

    [`GET ${BASE}/recordings/${CALL_SID}/metadata`]: () =>
      Response.json(METADATA_FIXTURE),

    [`GET ${BASE}/recordings/${CALL_SID}/download/recording.wav`]: () =>
      Response.json(DOWNLOAD_FIXTURE),
  }),
})

describe('RecordingsResource', () => {
  it('gets recording URLs', async () => {
    const result = await client.recordings.getUrls(CALL_SID)
    expect(result.call_sid).toBe(CALL_SID)
    // @ts-expect-error fixture field
    expect(result.recording_url).toContain('rec-001.wav')
    // @ts-expect-error fixture field
    expect(result.stereo_url).toContain('stereo')
  })

  it('gets recording metadata', async () => {
    const result = await client.recordings.getMetadata(CALL_SID)
    expect(result.call_sid).toBe(CALL_SID)
    expect(result.duration_seconds).toBe(185)
    // @ts-expect-error fixture field
    expect(result.channels).toBe(2)
    // @ts-expect-error fixture field
    expect(result.format).toBe('wav')
  })

  it('downloads a recording', async () => {
    const result = await client.recordings.download(CALL_SID, 'recording.wav')
    // @ts-expect-error fixture field
    expect(result.call_sid).toBe(CALL_SID)
    // @ts-expect-error fixture field
    expect(result.filename).toBe('recording.wav')
    // @ts-expect-error fixture field
    expect(result.url).toContain('download')
  })
})
