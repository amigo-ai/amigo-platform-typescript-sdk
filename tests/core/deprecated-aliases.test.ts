import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import {
  AmigoClient,
  AmigoError,
  ConcurrenceClient,
  ConcurrenceError,
  NotFoundError,
  isAmigoError,
  isConcurrenceError,
  type AmigoClientConfig,
  type AmigoConfig,
  type AmigoErrorWithBody,
  type AmigoRequestOptions,
  type AmigoResponse,
  type ConcurrenceClientConfig,
  type ConcurrenceConfig,
  type ConcurrenceErrorWithBody,
  type ConcurrenceRequestOptions,
  type ConcurrenceResponse,
  type HttpExceptionBody,
} from '../../src/index.js'
import { TEST_API_KEY } from '../test-helpers.js'

describe('deprecated Amigo* aliases', () => {
  it('export the same runtime references as the Concurrence* names', () => {
    expect(AmigoClient).toBe(ConcurrenceClient)
    expect(AmigoError).toBe(ConcurrenceError)
    expect(isAmigoError).toBe(isConcurrenceError)
  })

  it('constructs a ConcurrenceClient through new AmigoClient(...)', () => {
    const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: 'ws-001' })
    expect(client).toBeInstanceOf(ConcurrenceClient)
    expect(client).toBeInstanceOf(AmigoClient)
    expect(client.withOptions({ timeout: 1_000 })).toBeInstanceOf(AmigoClient)
  })

  it('matches errors thrown by the SDK with instanceof AmigoError and isAmigoError', async () => {
    const client = new ConcurrenceClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      maxRetries: 0,
      fetch: vi.fn(async () =>
        Response.json({ detail: 'Agent not found' }, { status: 404 }),
      ) as typeof fetch,
    })

    const error: unknown = await client.agents.get('missing-agent').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error).toBeInstanceOf(ConcurrenceError)
    expect(error).toBeInstanceOf(AmigoError)
    expect(isAmigoError(error)).toBe(true)
    expect(isConcurrenceError(error)).toBe(true)
  })

  it('keeps the Amigo* type aliases identical to the Concurrence* types', () => {
    expectTypeOf<AmigoClient>().toEqualTypeOf<ConcurrenceClient>()
    expectTypeOf<AmigoClientConfig>().toEqualTypeOf<ConcurrenceClientConfig>()
    expectTypeOf<AmigoConfig>().toEqualTypeOf<ConcurrenceConfig>()
    expectTypeOf<AmigoError>().toEqualTypeOf<ConcurrenceError>()
    expectTypeOf<AmigoErrorWithBody<HttpExceptionBody>>().toEqualTypeOf<
      ConcurrenceErrorWithBody<HttpExceptionBody>
    >()
    expectTypeOf<AmigoResponse<string>>().toEqualTypeOf<ConcurrenceResponse<string>>()
    expectTypeOf<AmigoRequestOptions>().toEqualTypeOf<ConcurrenceRequestOptions>()
  })
})
