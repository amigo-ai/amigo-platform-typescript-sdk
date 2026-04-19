const sdk = require('../../../dist/index.cjs')

const client = new sdk.AmigoClient({
  apiKey: 'test-api-key',
  workspaceId: 'ws_123',
})

if (!client.agents || !client.world || !client.webhookDestinations) {
  throw new Error('Expected public resources to be initialized')
}

console.log('CJS instantiation: OK')
