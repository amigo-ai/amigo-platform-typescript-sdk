import { describe, expect, it, vi } from 'vitest'
import {
  AmigoClient,
  AuthenticationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  PermissionError,
  ServerError,
  ServiceUnavailableError,
} from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const sourceId = '22222222-2222-4222-8222-222222222222'
const route = `DELETE /v1/${workspaceId}/intake/sources/${sourceId}`

describe('IntakeResource', () => {
  it('deletes the workspace-scoped registration and accepts bodyless retries', async () => {
    const client = new AmigoClient({
      apiKey: 'synthetic-api-key',
      workspaceId,
      fetch: mockFetch({
        [route]: ({ body }) => {
          expect(body).toBeUndefined()
          return new Response(null, { status: 204 })
        },
      }),
    })
    await expect(client.intake.deleteSource(sourceId)).resolves.toBeUndefined()
    await expect(client.intake.deleteSource(sourceId)).resolves.toBeUndefined()
  })

  it.each([
    { statusCode: 401, errorType: AuthenticationError },
    { statusCode: 403, errorType: PermissionError },
    { statusCode: 404, errorType: NotFoundError },
    { statusCode: 409, errorType: ConflictError },
    { statusCode: 500, errorType: ServerError },
    { statusCode: 503, errorType: ServiceUnavailableError },
  ])(
    'preserves the typed HTTP $statusCode error without automatically retrying DELETE',
    async ({ statusCode, errorType }) => {
      const fetch = vi.fn(
        mockFetch({
          [route]: () => Response.json({ detail: 'synthetic-error' }, { status: statusCode }),
        }),
      )
      const client = new AmigoClient({
        apiKey: 'synthetic-api-key',
        workspaceId,
        fetch,
      })
      const result = client.intake.deleteSource(sourceId)
      await expect(result).rejects.toBeInstanceOf(errorType)
      await expect(result).rejects.toMatchObject({ statusCode })
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('uses the configured proxy, authorization, and resource-scoped request options', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init)
      expect(request.url).toBe(
        `https://synthetic.example/api/platform/v1/${workspaceId}/intake/sources/${sourceId}`,
      )
      expect(request.method).toBe('DELETE')
      expect(request.headers.get('Authorization')).toBe('Bearer synthetic-api-key')
      expect(request.headers.get('X-Request-ID')).toBe('synthetic-delete-request')
      expect(request.body).toBeNull()
      return new Response(null, { status: 204 })
    })
    const client = new AmigoClient({
      apiKey: 'synthetic-api-key',
      workspaceId,
      baseUrl: 'https://synthetic.example/api/platform',
      fetch,
    })
    await client.intake
      .withOptions({
        headers: { 'X-Request-ID': 'synthetic-delete-request' },
      })
      .deleteSource(sourceId)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps clients for different workspaces isolated', async () => {
    const otherWorkspaceId = '33333333-3333-4333-8333-333333333333'
    const fetch = vi.fn(
      mockFetch({
        [route]: () => new Response(null, { status: 204 }),
        [`DELETE /v1/${otherWorkspaceId}/intake/sources/${sourceId}`]: () =>
          new Response(null, { status: 204 }),
      }),
    )
    const original = new AmigoClient({ apiKey: 'synthetic-api-key', workspaceId, fetch })
    const other = new AmigoClient({
      apiKey: 'synthetic-api-key',
      workspaceId: otherWorkspaceId,
      fetch,
    })
    await Promise.all([original.intake.deleteSource(sourceId), other.intake.deleteSource(sourceId)])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('preserves an uncertain network failure without retrying automatically', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError('Connection lost'))
    const client = new AmigoClient({ apiKey: 'synthetic-api-key', workspaceId, fetch })
    await expect(client.intake.deleteSource(sourceId)).rejects.toBeInstanceOf(NetworkError)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
