import * as sdk from '../../../dist/index.mjs'

if (typeof sdk.AmigoClient !== 'function') {
  throw new Error('AmigoClient export missing')
}

if (typeof sdk.parseWebhookEvent !== 'function') {
  throw new Error('parseWebhookEvent export missing')
}

console.log('ESM exports: OK')
