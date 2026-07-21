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

client.operators
  .list()
  .then((page) => client.operators.list({ continuation_token: page.continuation_token }))
client.operators
  .getEscalations()
  .then((page) => client.operators.getEscalations({ continuation_token: page.continuation_token }))
client.operators
  .getActiveEscalations()
  .then((page) =>
    client.operators.getActiveEscalations({ continuation_token: page.continuation_token }),
  )
client.operators
  .getAuditLog()
  .then((page) => client.operators.getAuditLog({ continuation_token: page.continuation_token }))

// @ts-expect-error Operator pagination no longer accepts offset parameters.
void client.operators.list({ offset: 1 })

client.calls.list().then((page) => {
  void (page.continuation_token satisfies number | null | undefined)
})

// @ts-expect-error Call pagination uses a numeric offset cursor.
void client.calls.list({ continuation_token: 'opaque-token' })
