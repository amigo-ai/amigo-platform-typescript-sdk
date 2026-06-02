/**
 * Device code login — authenticate a CLI or headless app via browser approval.
 *
 * Usage:
 *   AMIGO_WORKSPACE_ID=<workspace-uuid> npx tsx examples/auth/device-code-login.ts
 *
 * Device login is workspace-specific: the device code is pinned to a workspace
 * at issuance, the user approves it in their browser while signed into that
 * workspace, and the CLI receives a workspace-scoped JWT. Provide the target
 * workspace via AMIGO_WORKSPACE_ID.
 */

import {
  AmigoClient,
  loginWithDeviceCode,
  openBrowser,
  formatDeviceCodeInstructions,
  TokenManager,
  FileTokenStorage,
} from '@amigo-ai/platform-sdk'

async function main() {
  // The CLI must know which workspace to authenticate for — there is no
  // post-login workspace prompt anymore.
  const workspaceId = process.env.AMIGO_WORKSPACE_ID
  if (!workspaceId) {
    throw new Error('Set AMIGO_WORKSPACE_ID to the workspace UUID you want to sign into.')
  }

  const tokens = new TokenManager({ storage: new FileTokenStorage() })

  // Try cached credentials first
  const cached = await tokens.getAccessToken()
  if (cached) {
    console.log(`Already authenticated for workspace ${cached.workspaceId}`)
    return
  }

  // No cached token — run device code flow for the requested workspace
  const result = await loginWithDeviceCode({
    workspaceId,
    clientDescription: 'sdk-example',
    onCode: async (issuance) => {
      console.log(formatDeviceCodeInstructions(issuance))
      const opened = await openBrowser(issuance.verification_uri_complete)
      if (!opened) {
        console.log(`  Could not open browser. Visit the URL above manually.`)
      }
    },
    onStatus: (status) => {
      if (status === 'authorization_pending') {
        process.stdout.write('.')
      }
    },
  })

  await tokens.store(result)
  console.log(`\nAuthenticated for workspace ${result.workspaceId}`)
  console.log(`Token expires at ${new Date(result.expiresAt * 1000).toISOString()}`)

  // Use the token with AmigoClient (JWT is passed as apiKey — Bearer auth)
  const client = new AmigoClient({
    apiKey: result.accessToken,
    workspaceId: result.workspaceId,
  })

  const { items: agents } = await client.agents.list({ limit: 3 })
  console.log(`\nFound ${agents.length} agent(s):`)
  for (const agent of agents) {
    console.log(`  - ${agent.name}`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
