import type { MethodResponse } from 'openapi-fetch'
import { AmigoClient } from '../src/index.js'

// Compile-only assertions for the SDK's low-level request helper types.

type TypeEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Condition extends true> = Condition
type SdkPayload<Data> = Omit<Data, '_request_id' | 'lastResponse'>

const client = new AmigoClient({
  apiKey: 'test-key',
  workspaceId: 'ws-001',
})

void client.GET('/v1/{workspace_id}/agents')
client.GET('/v1/{workspace_id}/agents').then((response) => {
  void response.data.items
  void (response.data.items?.[0]?.id satisfies string | undefined)

  const bodyResponseMustNotBeUndefined: Exclude<typeof response.data, undefined> = response.data
  void bodyResponseMustNotBeUndefined
  void (response.data satisfies NonNullable<typeof response.data>)
  // @ts-expect-error body responses must not widen to undefined
  const bodyResponseShouldNotAcceptUndefined: undefined = response.data
  void bodyResponseShouldNotAcceptUndefined

  // MethodResponse comes from openapi-fetch to lock compatibility with the
  // upstream helper type that downstream users already rely on.
  const upstreamResponse: MethodResponse<typeof client.api, 'get', '/v1/{workspace_id}/agents'> =
    response.data
  void upstreamResponse
  const sdkPayload: SdkPayload<typeof response.data> = upstreamResponse
  void sdkPayload
  const listPayloadMatches: Assert<
    TypeEqual<SdkPayload<typeof response.data>, typeof upstreamResponse>
  > = true
  void listPayloadMatches

  // @ts-expect-error low-level response data must not expose arbitrary keys
  void response.data.not_a_real_field
})

client
  .POST('/v1/{workspace_id}/agents', {
    body: { name: 'Test Agent' },
  })
  .then((response) => {
    const upstreamResponse: MethodResponse<typeof client.api, 'post', '/v1/{workspace_id}/agents'> =
      response.data
    const sdkPayload: SdkPayload<typeof response.data> = upstreamResponse
    void sdkPayload
    const postPayloadMatches: Assert<
      TypeEqual<SdkPayload<typeof response.data>, typeof upstreamResponse>
    > = true
    void postPayloadMatches
  })

client
  .PATCH('/v1/{workspace_id}/data-sources/{data_source_id}', {
    params: { path: { data_source_id: 'ds-123' } },
    body: { display_name: 'Updated Data Source' },
  })
  .then((response) => {
    const upstreamResponse: MethodResponse<
      typeof client.api,
      'patch',
      '/v1/{workspace_id}/data-sources/{data_source_id}'
    > = response.data
    const sdkPayload: SdkPayload<typeof response.data> = upstreamResponse
    void sdkPayload
    const patchPayloadMatches: Assert<
      TypeEqual<SdkPayload<typeof response.data>, typeof upstreamResponse>
    > = true
    void patchPayloadMatches
  })

client
  .GET('/v1/{workspace_id}/agents/{agent_id}', {
    params: { path: { agent_id: 'agent-123' } },
  })
  .then((response) => {
    void (response.data.id satisfies string)

    const upstreamResponse: MethodResponse<
      typeof client.api,
      'get',
      '/v1/{workspace_id}/agents/{agent_id}'
    > = response.data
    void upstreamResponse

    // @ts-expect-error single-agent response data must not expose arbitrary keys
    void response.data.not_a_real_field
  })

client
  .DELETE('/v1/{workspace_id}/agents/{agent_id}', {
    params: { path: { agent_id: 'agent-123' } },
  })
  .then((response) => {
    const noContent: undefined = response.data
    void noContent
    const deletePayloadMatches: Assert<TypeEqual<typeof response.data, undefined>> = true
    void deletePayloadMatches

    // @ts-expect-error DELETE no-content response must not expose body fields
    void response.data.not_a_real_field
  })

// @ts-expect-error agent_id must stay required on low-level helpers
void client.GET('/v1/{workspace_id}/agents/{agent_id}')

const scopedClient = client.withOptions({
  headers: { 'X-Test': 'true' },
  timeout: 1_000,
})

void scopedClient.GET('/v1/{workspace_id}/agents')
void scopedClient.agents.withOptions({ timeout: 500 }).get('agent-123')
