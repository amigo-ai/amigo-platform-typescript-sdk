import { AmigoClient, paginate, type ExternalIntegration } from '../src/index.js'

const client = new AmigoClient({
  apiKey: 'test-key',
  workspaceId: 'ws-001',
})

client.externalIntegrations.list().then((page) =>
  client.externalIntegrations.list({
    continuation_token: page.continuation_token,
  }),
)

const externalIntegrations = paginate((continuationToken) =>
  client.externalIntegrations.list({ continuation_token: continuationToken }),
)
void (externalIntegrations satisfies AsyncGenerator<ExternalIntegration>)

client.calls.list().then((page) => {
  void (page.continuation_token satisfies number | null | undefined)
})

// @ts-expect-error Call pagination uses a numeric offset cursor.
void client.calls.list({ continuation_token: 'opaque-token' })
