import { ConcurrenceClient } from '@concurrence-hq/platform-sdk'

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function createClient(): ConcurrenceClient {
  return new ConcurrenceClient({
    apiKey: requireEnv('AMIGO_API_KEY'),
    workspaceId: requireEnv('AMIGO_WORKSPACE_ID'),
    baseUrl: process.env.AMIGO_BASE_URL,
  })
}
