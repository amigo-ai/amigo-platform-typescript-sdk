import { describe, it, expect } from 'vitest'
import { verifyWebhookSignature, parseWebhookEvent } from '../../src/core/webhooks.js'

const SECRET = 'test-secret-key'

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}

describe('verifyWebhookSignature', () => {
  it('accepts valid signature', async () => {
    const payload = '{"type":"test"}'
    const sig = await sign(payload, SECRET)
    expect(await verifyWebhookSignature(payload, sig, SECRET)).toBe(true)
  })

  it('rejects invalid signature', async () => {
    expect(await verifyWebhookSignature('payload', 'sha256=bad', SECRET)).toBe(false)
  })
})

describe('parseWebhookEvent', () => {
  it('parses valid event', async () => {
    const event = {
      id: 'evt-1',
      type: 'call.completed',
      timestamp: '2026-01-01T00:00:00Z',
      data: { call_id: 'c1' },
    }
    const payload = JSON.stringify(event)
    const sig = await sign(payload, SECRET)
    const parsed = await parseWebhookEvent(payload, sig, SECRET)
    expect(parsed.type).toBe('call.completed')
    expect(parsed.data).toEqual({ call_id: 'c1' })
  })

  it('throws on invalid signature', async () => {
    await expect(parseWebhookEvent('{}', 'sha256=bad', SECRET)).rejects.toThrow(
      'Invalid webhook signature',
    )
  })
})
