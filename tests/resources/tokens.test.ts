import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'configured-api-key'
const EXCHANGE_API_KEY = 'exchange-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE_URL = 'https://platform-proxy.example'
const TOKEN_RESPONSE = {
  access_token: 'eyJhbGciOiJSUzI1NiJ9.test',
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'entities:read agents:read',
  session_id: null,
  refresh_token: null,
}

interface CapturedTokenRequest {
  href: string
  url: string
  method: string
  body: string
  contentType: string | null
  authorization: string | null
  traceId: string | null
}

function recordingFetch(captured: CapturedTokenRequest): typeof globalThis.fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)

    captured.href = request.url
    captured.url = new URL(request.url).pathname
    captured.method = request.method.toUpperCase()
    captured.body = await request.clone().text()
    captured.contentType = request.headers.get('Content-Type')
    captured.authorization = request.headers.get('Authorization')
    captured.traceId = request.headers.get('X-Trace-Id')

    return Response.json(TOKEN_RESPONSE)
  }
}

function createCapturedRequest(): CapturedTokenRequest {
  return {
    href: '',
    url: '',
    method: '',
    body: '',
    contentType: null,
    authorization: null,
    traceId: null,
  }
}

describe('TokensResource', () => {
  it('exchanges an API key for a JWT through POST /token', async () => {
    const captured = createCapturedRequest()
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: BASE_URL,
      fetch: recordingFetch(captured),
    })

    const result = await client.tokens.exchangeApiKey({
      apiKey: EXCHANGE_API_KEY,
      scope: 'entities:read agents:read',
    })

    expect(captured.href).toBe(`${BASE_URL}/token`)
    expect(captured.url).toBe('/token')
    expect(captured.url).not.toContain(TEST_WORKSPACE_ID)
    expect(captured.method).toBe('POST')
    expect(captured.contentType).toContain('application/x-www-form-urlencoded')
    expect(captured.authorization).toBeNull()

    const form = new URLSearchParams(captured.body)
    expect(form.get('grant_type')).toBe('api_key')
    expect(form.get('api_key')).toBe(EXCHANGE_API_KEY)
    expect(form.get('scope')).toBe('entities:read agents:read')
    expect(result).toMatchObject(TOKEN_RESPONSE)
  })

  it('preserves scoped request headers on token exchange', async () => {
    const captured = createCapturedRequest()
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: recordingFetch(captured),
    })

    await client.tokens
      .withOptions({ headers: { 'X-Trace-Id': 'trace-token-exchange' } })
      .exchangeApiKey({ apiKey: EXCHANGE_API_KEY })

    expect(captured.traceId).toBe('trace-token-exchange')
  })
})
