import * as sdk from '../../../dist/index.mjs'

const client = new sdk.AmigoClient({
  apiKey: 'test-api-key',
  workspaceId: 'ws_123',
})

if (!client.agents || !client.world || !client.webhookDestinations) {
  throw new Error('Expected public resources to be initialized')
}

console.log('ESM instantiation: OK')
