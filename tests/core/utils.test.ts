import { describe, expect, it, vi } from 'vitest'
import { paginate } from '../../src/index.js'

describe('paginate', () => {
  it('round-trips opaque continuation tokens', async () => {
    const fetchPage = vi.fn(async (continuationToken?: string) => ({
      items: [continuationToken ?? 'first'],
      has_more: continuationToken === undefined,
      continuation_token: continuationToken === undefined ? 'next-page' : null,
    }))

    const items: string[] = []
    for await (const item of paginate(fetchPage)) {
      items.push(item)
    }

    expect(items).toEqual(['first', 'next-page'])
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 'next-page')
  })

  it('stops when a response omits the next token', async () => {
    const fetchPage = vi.fn(async () => ({ items: ['only'], has_more: true }))

    const items: string[] = []
    for await (const item of paginate(fetchPage)) {
      items.push(item)
    }

    expect(items).toEqual(['only'])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
