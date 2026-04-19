'use strict'

const { AmigoClient } = require('../../../dist/index.cjs')

const client = new AmigoClient({
  apiKey: 'test-key',
  workspaceId: 'ws-test-00000000-0000-0000-0000-000000000001',
})

if (!client.agents) {
  throw new Error('client.agents is missing')
}

if (!client.services) {
  throw new Error('client.services is missing')
}

if (!client.world) {
  throw new Error('client.world is missing')
}

console.log('CJS instantiation: OK')
