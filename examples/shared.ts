import { AmigoClient } from '@amigo-ai/platform-sdk'

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function createClient(): AmigoClient {
  return new AmigoClient({
    apiKey: requireEnv('AMIGO_API_KEY'),
    workspaceId: requireEnv('AMIGO_WORKSPACE_ID'),
    baseUrl: process.env.AMIGO_BASE_URL,
  })
}
