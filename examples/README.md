# SDK Examples

These examples are intentionally small and map directly to the public package surface.

- Primary product docs: [docs.amigo.ai](https://docs.amigo.ai/)
- API reference: [docs.amigo.ai/api-reference](https://docs.amigo.ai/api-reference)

Unlike the broader docs estate, these files live with the SDK and are typechecked in CI so they stay aligned with the shipped client.

## Environment

Copy [`.env.example`](./.env.example) into your local environment or export the same variables in your shell:

- `AMIGO_API_KEY`
- `AMIGO_WORKSPACE_ID`
- `AMIGO_BASE_URL` (optional)
- `AMIGO_WEBHOOK_SECRET` (webhook example)
- `AMIGO_WEBHOOK_SIGNATURE` (webhook example)
- `AMIGO_WEBHOOK_TIMESTAMP` (optional, webhook example)
- `AMIGO_WEBHOOK_BODY` (optional, webhook example)

## Examples

- [examples/basic/list-agents.ts](./basic/list-agents.ts): list agents with the public client
- [examples/analytics/dashboard.ts](./analytics/dashboard.ts): read dashboard and call analytics
- [examples/world/search-entities.ts](./world/search-entities.ts): query entities and inspect timelines
- [examples/webhooks/verify-webhook.ts](./webhooks/verify-webhook.ts): verify and parse a webhook delivery
