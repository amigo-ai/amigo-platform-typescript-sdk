import { createClient } from '../shared.js'

const client = createClient()

const result = await client.GET('/v1/{workspace_id}/agents', {
  params: { query: { limit: 10 } },
  timeout: 5_000,
  maxRetries: 1,
  headers: { 'X-Debug-Trace': 'true' },
})

console.log('Request ID:', result.requestId)
console.log('Status:', result.response.status)
console.log('Remaining rate limit:', result.rateLimit.remaining)
console.log('Agents:')
console.log(JSON.stringify(result.data.items, null, 2))
