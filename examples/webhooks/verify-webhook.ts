import {
  WebhookVerificationError,
  parseWebhookEvent,
  type WebhookEvent,
} from '@amigo-ai/platform-sdk'
import { requireEnv } from '../shared.js'

type CallCompletedData = {
  call_id?: string
}

const payload =
  process.env.AMIGO_WEBHOOK_BODY ??
  '{"id":"evt_123","type":"call.completed","timestamp":"2026-01-01T00:00:00Z","data":{"call_id":"call_123"}}'

const signature = requireEnv('AMIGO_WEBHOOK_SIGNATURE')
const secret = requireEnv('AMIGO_WEBHOOK_SECRET')
const timestamp = process.env.AMIGO_WEBHOOK_TIMESTAMP

try {
  const event = await parseWebhookEvent<CallCompletedData>({
    payload,
    signature,
    secret,
    timestamp,
  })

  logEvent(event)
} catch (error) {
  if (error instanceof WebhookVerificationError) {
    console.error(`Webhook rejected: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}

function logEvent(event: WebhookEvent<CallCompletedData>) {
  console.log(`Verified ${event.type}`)
  console.log(JSON.stringify(event.data, null, 2))
}
