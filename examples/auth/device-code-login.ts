/**
 * Device code login — authenticate a CLI or headless app via browser approval.
 *
 * Usage:
 *   npx tsx examples/auth/device-code-login.ts
 *
 * The script issues a device code, opens the approval page in the browser,
 * polls until the user approves, handles workspace selection, and prints
 * the resulting workspace-scoped JWT.
 */

import * as readline from 'node:readline'
import {
  AmigoClient,
  loginWithDeviceCode,
  openBrowser,
  formatDeviceCodeInstructions,
  formatWorkspaceList,
  TokenManager,
  FileTokenStorage,
  type WorkspaceChoice,
} from '@amigo-ai/platform-sdk'

async function promptWorkspace(workspaces: WorkspaceChoice[]): Promise<string> {
  console.log(formatWorkspaceList(workspaces))

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => {
    rl.question('  Select workspace (number): ', resolve)
  })
  rl.close()

  const index = parseInt(answer, 10) - 1
  const workspace = workspaces[index]
  if (!workspace) {
    throw new Error(`Invalid selection: ${answer}`)
  }
  return workspace.workspace_id
}

async function main() {
  const tokens = new TokenManager({ storage: new FileTokenStorage() })

  // Try cached credentials first
  const cached = await tokens.getAccessToken()
  if (cached) {
    console.log(`Already authenticated for workspace ${cached.workspaceId}`)
    return
  }

  // No cached token — run device code flow
  const result = await loginWithDeviceCode({
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
    onWorkspaceRequired: promptWorkspace,
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
