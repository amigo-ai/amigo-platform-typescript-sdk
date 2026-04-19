const textEncoder = new TextEncoder()
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000
type WebCryptoLike = { subtle: NonNullable<typeof globalThis.crypto>['subtle'] }

let webCryptoPromise: Promise<WebCryptoLike> | undefined

export interface WebhookEvent<T = unknown> {
  id: string
  type: string
  timestamp: string
  data: T
}

export interface WebhookVerificationOptions {
  payload: string | Uint8Array | ArrayBuffer
  signature: string
  secret: string
  timestamp?: string
  maxAgeMs?: number
}

export interface ParseWebhookEventOptions<T = unknown> extends WebhookVerificationOptions {
  payload: string | Uint8Array | ArrayBuffer
  expectedType?: string
  reviver?: Parameters<typeof JSON.parse>[1]
  validate?: (event: WebhookEvent<T>) => void
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookVerificationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export async function verifyWebhookSignature(
  payload: string | Uint8Array | ArrayBuffer,
  signature: string,
  secret: string,
): Promise<boolean>
export async function verifyWebhookSignature(options: WebhookVerificationOptions): Promise<boolean>
export async function verifyWebhookSignature(
  payloadOrOptions: string | Uint8Array | ArrayBuffer | WebhookVerificationOptions,
  signature?: string,
  secret?: string,
): Promise<boolean> {
  const options = normalizeVerificationOptions(payloadOrOptions, signature, secret)
  const payloadBytes = toUint8Array(options.payload)
  const expectedSignature = await signWebhookPayload(
    payloadBytes,
    options.secret,
    options.timestamp,
  )
  const actualSignature = normalizeSignature(options.signature)

  if (!actualSignature || !constantTimeEqual(expectedSignature, actualSignature)) {
    return false
  }

  if (options.timestamp) {
    const timestampMs = parseTimestamp(options.timestamp)
    if (timestampMs === undefined) return false

    const maxAgeMs = options.maxAgeMs ?? MAX_TIMESTAMP_SKEW_MS
    const now = Date.now()
    if (timestampMs > now + maxAgeMs || now - timestampMs > maxAgeMs) {
      return false
    }
  }

  return true
}

export async function parseWebhookEvent<T = unknown>(
  payload: string,
  signature: string,
  secret: string,
): Promise<WebhookEvent<T>>
export async function parseWebhookEvent<T = unknown>(
  options: ParseWebhookEventOptions<T>,
): Promise<WebhookEvent<T>>
export async function parseWebhookEvent<T = unknown>(
  payloadOrOptions: string | ParseWebhookEventOptions<T>,
  signature?: string,
  secret?: string,
): Promise<WebhookEvent<T>> {
  const options = normalizeParseOptions(payloadOrOptions, signature, secret)
  const valid = await verifyWebhookSignature(options)

  if (!valid) {
    throw new WebhookVerificationError('Invalid or expired webhook signature')
  }

  const payloadText = decodePayload(options.payload)

  let event: WebhookEvent<T>
  try {
    event = JSON.parse(payloadText, options.reviver) as WebhookEvent<T>
  } catch {
    throw new WebhookVerificationError('Invalid JSON webhook payload')
  }

  if (options.expectedType && event.type !== options.expectedType) {
    throw new WebhookVerificationError(
      `Unexpected webhook event type: expected ${options.expectedType}, received ${event.type}`,
    )
  }

  options.validate?.(event)
  return event
}

function normalizeVerificationOptions(
  payloadOrOptions: string | Uint8Array | ArrayBuffer | WebhookVerificationOptions,
  signature?: string,
  secret?: string,
): WebhookVerificationOptions {
  if (
    typeof payloadOrOptions === 'object' &&
    payloadOrOptions !== null &&
    'payload' in payloadOrOptions
  ) {
    return payloadOrOptions
  }

  if (!signature || !secret) {
    throw new TypeError('signature and secret are required')
  }

  return {
    payload: payloadOrOptions,
    signature,
    secret,
  }
}

function normalizeParseOptions<T>(
  payloadOrOptions: string | ParseWebhookEventOptions<T>,
  signature?: string,
  secret?: string,
): ParseWebhookEventOptions<T> {
  if (
    typeof payloadOrOptions === 'object' &&
    payloadOrOptions !== null &&
    'payload' in payloadOrOptions
  ) {
    return payloadOrOptions
  }

  if (!signature || !secret) {
    throw new TypeError('signature and secret are required')
  }

  return {
    payload: payloadOrOptions,
    signature,
    secret,
  }
}

function decodePayload(payload: string | Uint8Array | ArrayBuffer): string {
  if (typeof payload === 'string') return payload
  return new TextDecoder().decode(toUint8Array(payload))
}

function toUint8Array(payload: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof payload === 'string') return textEncoder.encode(payload)
  if (payload instanceof Uint8Array) return payload
  return new Uint8Array(payload)
}

async function signWebhookPayload(
  payload: Uint8Array,
  secret: string,
  timestamp?: string,
): Promise<Uint8Array> {
  const crypto = await resolveWebCrypto()
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const message = timestamp
    ? concatUint8Arrays(textEncoder.encode(`v1:${timestamp}:`), payload)
    : payload

  const mac = await crypto.subtle.sign('HMAC', key, toCryptoBuffer(message))
  return new Uint8Array(mac)
}

async function resolveWebCrypto(): Promise<WebCryptoLike> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto
  }

  webCryptoPromise ??= import('node:crypto').then(({ webcrypto }) => webcrypto as WebCryptoLike)
  return await webCryptoPromise
}

function normalizeSignature(signature: string): Uint8Array | undefined {
  const normalized = signature.startsWith('sha256=') ? signature.slice(7) : signature
  if (!/^[a-fA-F0-9]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return undefined
  }

  const bytes = new Uint8Array(normalized.length / 2)
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16)
  }
  return bytes
}

function constantTimeEqual(expected: Uint8Array, actual: Uint8Array): boolean {
  const maxLength = Math.max(expected.length, actual.length)
  let diff = expected.length ^ actual.length

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (expected[index] ?? 0) ^ (actual[index] ?? 0)
  }

  return diff === 0
}

function parseTimestamp(timestamp: string): number | undefined {
  const numeric = Number(timestamp)
  if (Number.isFinite(numeric)) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
  }

  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? undefined : parsed
}

function concatUint8Arrays(left: Uint8Array, right: Uint8Array): Uint8Array {
  const combined = new Uint8Array(left.length + right.length)
  combined.set(left, 0)
  combined.set(right, left.length)
  return combined
}

function toCryptoBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = Uint8Array.from(bytes)
  return copy.buffer
}
