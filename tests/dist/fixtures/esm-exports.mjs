import * as sdk from '../../../dist/index.mjs'

if (typeof sdk.ConcurrenceClient !== 'function') {
  throw new Error('ConcurrenceClient export missing')
}

if (typeof sdk.parseWebhookEvent !== 'function') {
  throw new Error('parseWebhookEvent export missing')
}

console.log('ESM exports: OK')
