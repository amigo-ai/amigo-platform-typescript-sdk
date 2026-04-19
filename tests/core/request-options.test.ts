import { describe, expect, it } from 'vitest'
import {
  mergeHeaders,
  mergeRequestOptions,
  mergeScopedRequestOptions,
  stripRequestControls,
} from '../../src/core/request-options.js'

describe('request option utilities', () => {
  it('strips request control fields and preserves the remaining options', () => {
    expect(stripRequestControls(undefined)).toBeUndefined()

    expect(
      stripRequestControls({
        timeout: 1_000,
        maxRetries: 2,
        retry: { maxAttempts: 3 },
        headers: { 'X-Test': 'true' },
      }),
    ).toEqual({
      headers: { 'X-Test': 'true' },
    })
  })

  it('merges request options with header and control precedence', () => {
    const signal = new AbortController().signal
    const merged = mergeRequestOptions(
      {
        headers: { 'X-Base': '1', 'X-Removed': 'keep' },
        signal,
        timeout: 1_000,
        maxRetries: 1,
        retry: { maxAttempts: 2 },
      },
      {
        headers: {
          'X-Base': '2',
          'X-Removed': null,
          'X-Added': ['a', 'b'],
        },
        timeout: 2_000,
        retry: { maxAttempts: 4 },
      },
    )

    expect(merged?.headers).toBeInstanceOf(Headers)
    expect((merged?.headers as Headers).get('X-Base')).toBe('2')
    expect((merged?.headers as Headers).get('X-Removed')).toBeNull()
    expect((merged?.headers as Headers).get('X-Added')).toBe('a, b')
    expect(merged?.signal).toBe(signal)
    expect(merged?.timeout).toBe(2_000)
    expect(merged?.maxRetries).toBe(1)
    expect(merged?.retry).toEqual({ maxAttempts: 4 })
  })

  it('returns the available side when only one request option source exists', () => {
    expect(mergeRequestOptions(undefined, { headers: { 'X-Test': 'true' } })).toEqual({
      headers: { 'X-Test': 'true' },
    })

    expect(mergeRequestOptions({ timeout: 500 }, undefined)).toEqual({
      timeout: 500,
    })

    expect(mergeScopedRequestOptions(undefined, { timeout: 750 })).toEqual({
      timeout: 750,
    })
  })

  it('merges headers from Headers, tuple arrays, and objects', () => {
    const mergedFromTuples = mergeHeaders(new Headers({ 'X-Base': '1' }), [
      ['', 'ignored'],
      ['X-Base', undefined as unknown as string],
      ['X-Tuple', 2],
    ] as never)

    expect(mergedFromTuples?.get('X-Base')).toBeNull()
    expect(mergedFromTuples?.get('X-Tuple')).toBe('2')

    const mergedFromObject = mergeHeaders(
      { 'X-List': ['a', 'b'], 'X-Delete': 'value' },
      { 'X-Delete': null, 'X-Next': 'set' },
    )

    expect(mergedFromObject?.get('X-List')).toBe('a, b')
    expect(mergedFromObject?.get('X-Delete')).toBeNull()
    expect(mergedFromObject?.get('X-Next')).toBe('set')
    expect(mergeHeaders(undefined, undefined)).toBeUndefined()
  })
})
