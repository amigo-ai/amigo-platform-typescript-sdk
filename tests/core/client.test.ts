import { describe, expect, it, vi } from 'vitest'
import { AmigoClient, ConfigurationError } from '../../src/index.js'
import { TEST_API_KEY, fixtures } from '../test-helpers.js'

describe('AmigoClient configuration', () => {
  it('throws on missing apiKey', () => {
    expect(() => new AmigoClient({ apiKey: '', workspaceId: 'ws-001' })).toThrow(
      ConfigurationError,
    )
  })

  it('throws on missing workspaceId', () => {
    expect(() => new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: '' })).toThrow(
      ConfigurationError,
    )
  })

  it('normalizes trailing slashes on baseUrl', async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      expect(request.url).toBe('https://api.example.com/v1/ws-001/agents')
      return Response.json(fixtures.paginatedList([]))
    })

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      baseUrl: 'https://api.example.com/',
      fetch: mockFetch as typeof fetch,
    })

    await client.agents.list()
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('forwards requests through the provided fetch implementation', async () => {
    const mockFetch = vi.fn(async () => Response.json(fixtures.paginatedList([fixtures.agent()])))

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      fetch: mockFetch as typeof fetch,
    })

    const result = await client.agents.list()
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Test Agent')
  })

  it('initializes the public resource surface', () => {
    const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: 'ws-001' })

    expect(client.workspaces).toBeDefined()
    expect(client.agents).toBeDefined()
    expect(client.actions).toBeDefined()
    expect(client.services).toBeDefined()
    expect(client.world).toBeDefined()
    expect(client.webhookDestinations).toBeDefined()
  })
})
