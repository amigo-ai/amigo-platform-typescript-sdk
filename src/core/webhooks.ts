export interface WebhookEvent<T = unknown> {
  id: string
  type: string
  timestamp: string
  data: T
}

export async function verifyWebhookSignature(
  payload: string | Uint8Array,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    typeof payload === 'string' ? encoder.encode(payload) : payload,
  )
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return signature === `sha256=${expected}`
}

export async function parseWebhookEvent<T = unknown>(
  payload: string,
  signature: string,
  secret: string,
): Promise<WebhookEvent<T>> {
  const valid = await verifyWebhookSignature(payload, signature, secret)
  if (!valid) {
    throw new Error('Invalid webhook signature')
  }
  return JSON.parse(payload) as WebhookEvent<T>
}
