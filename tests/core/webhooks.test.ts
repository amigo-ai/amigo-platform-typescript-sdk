import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  parseWebhookEvent,
  verifyWebhookSignature,
  WebhookVerificationError,
} from '../../src/core/webhooks.js'

const SECRET = 'test-secret-key'
const BASE_TIME = Date.parse('2026-01-01T00:00:00Z')
type WebCryptoLike = { subtle: NonNullable<typeof globalThis.crypto>['subtle'] }

let webCryptoPromise: Promise<WebCryptoLike> | undefined

async function sign(payload: string, secret: string, timestamp?: string): Promise<string> {
  const crypto = await resolveWebCrypto()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const message = timestamp ? `${`v1:${timestamp}:`}${payload}` : payload

  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const hex = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${hex}`
}

async function resolveWebCrypto(): Promise<WebCryptoLike> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto
  }

  webCryptoPromise ??= import('node:crypto').then(({ webcrypto }) => webcrypto as WebCryptoLike)
  return await webCryptoPromise
}

describe('verifyWebhookSignature', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a valid legacy signature', async () => {
    const payload = '{"type":"test"}'
    const signature = await sign(payload, SECRET)

    await expect(verifyWebhookSignature(payload, signature, SECRET)).resolves.toBe(true)
  })

  it('accepts a valid timestamped signature', async () => {
    const payload = '{"type":"test"}'
    const timestamp = new Date(BASE_TIME).toISOString()
    const signature = await sign(payload, SECRET, timestamp)

    await expect(
      verifyWebhookSignature({ payload, signature, secret: SECRET, timestamp }),
    ).resolves.toBe(true)
  })

  it('rejects an invalid signature', async () => {
    await expect(verifyWebhookSignature('payload', 'sha256=bad', SECRET)).resolves.toBe(false)
  })

  it('rejects an expired timestamped signature', async () => {
    const payload = '{"type":"test"}'
    const timestamp = new Date(BASE_TIME - 10 * 60 * 1000).toISOString()
    const signature = await sign(payload, SECRET, timestamp)

    await expect(
      verifyWebhookSignature({
        payload,
        signature,
        secret: SECRET,
        timestamp,
        maxAgeMs: 60_000,
      }),
    ).resolves.toBe(false)
  })
})

describe('parseWebhookEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses a valid event with legacy arguments', async () => {
    const event = {
      id: 'evt-1',
      type: 'call.completed',
      timestamp: '2026-01-01T00:00:00Z',
      data: { call_id: 'c1' },
    }
    const payload = JSON.stringify(event)
    const signature = await sign(payload, SECRET)

    await expect(parseWebhookEvent(payload, signature, SECRET)).resolves.toEqual(event)
  })

  it('parses a valid event with replay protection', async () => {
    const event = {
      id: 'evt-2',
      type: 'call.completed',
      timestamp: '2026-01-01T00:00:00Z',
      data: { call_id: 'c2' },
    }
    const payload = JSON.stringify(event)
    const timestamp = new Date(BASE_TIME).toISOString()
    const signature = await sign(payload, SECRET, timestamp)

    const parsed = await parseWebhookEvent({
      payload: new TextEncoder().encode(payload),
      signature,
      secret: SECRET,
      timestamp,
      expectedType: 'call.completed',
    })

    expect(parsed).toEqual(event)
  })

  it('throws a typed error on invalid signature', async () => {
    await expect(parseWebhookEvent('{}', 'sha256=bad', SECRET)).rejects.toBeInstanceOf(
      WebhookVerificationError,
    )
  })

  it('throws a typed error on invalid JSON', async () => {
    const payload = 'not-json'
    const signature = await sign(payload, SECRET)

    await expect(parseWebhookEvent(payload, signature, SECRET)).rejects.toThrow(
      'Invalid JSON webhook payload',
    )
  })

  it('throws on unexpected event type', async () => {
    const event = {
      id: 'evt-3',
      type: 'call.completed',
      timestamp: '2026-01-01T00:00:00Z',
      data: { call_id: 'c3' },
    }
    const payload = JSON.stringify(event)
    const timestamp = new Date(BASE_TIME).toISOString()
    const signature = await sign(payload, SECRET, timestamp)

    await expect(
      parseWebhookEvent({
        payload,
        signature,
        secret: SECRET,
        timestamp,
        expectedType: 'call.failed',
      }),
    ).rejects.toThrow('Unexpected webhook event type')
  })
})
