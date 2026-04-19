import { createClient } from '../shared.js'

const client = createClient()

const agents = await client
  .withOptions({
    timeout: 5_000,
    maxRetries: 1,
    headers: { 'X-Debug-Trace': 'true' },
  })
  .agents.list({ limit: 10 })

console.log('Request ID:', agents._request_id)
console.log('Status:', agents.lastResponse.statusCode)
console.log('Remaining rate limit:', agents.lastResponse.rateLimit.remaining)
console.log('Agents:')
console.log(JSON.stringify(agents.items, null, 2))
