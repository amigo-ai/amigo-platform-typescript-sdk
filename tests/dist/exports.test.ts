/**
 * Distribution tests — verify the built artifact exports correctly.
 * Run after `npm run build` with: npm run test:dist
 *
 * These tests use dynamic import() at runtime so TypeScript doesn't
 * need to resolve the dist paths at compile time.
 */

import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname ?? __dirname, '../..')

describe('dist artifacts exist', () => {
  it('ESM bundle exists', () => {
    expect(existsSync(resolve(ROOT, 'dist/index.mjs'))).toBe(true)
  })

  it('CJS bundle exists', () => {
    expect(existsSync(resolve(ROOT, 'dist/index.cjs'))).toBe(true)
  })

  it('type declarations exist', () => {
    expect(existsSync(resolve(ROOT, 'dist/types/index.d.ts'))).toBe(true)
  })
})

describe('ESM exports', () => {
  it('exports ConcurrenceClient and error classes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(resolve(ROOT, 'dist/index.mjs')) as Record<string, any>
    expect(mod['ConcurrenceClient']).toBeDefined()
    expect(typeof mod['ConcurrenceClient']).toBe('function')
    expect(mod['ConcurrenceError']).toBeDefined()
    expect(mod['NotFoundError']).toBeDefined()
    expect(mod['AuthenticationError']).toBeDefined()
  })

  it('ConcurrenceClient can be instantiated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { ConcurrenceClient } = await import(resolve(ROOT, 'dist/index.mjs')) as Record<string, any>
    const client = new ConcurrenceClient({ apiKey: 'test-key', workspaceId: 'ws-001' })
    expect(client.agents).toBeDefined()
    expect(client.skills).toBeDefined()
    expect(client.world).toBeDefined()
  })

  it('keeps deprecated Amigo* aliases as the same references', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(resolve(ROOT, 'dist/index.mjs')) as Record<string, any>
    expect(mod['AmigoClient']).toBe(mod['ConcurrenceClient'])
    expect(mod['AmigoError']).toBe(mod['ConcurrenceError'])
    expect(mod['isAmigoError']).toBe(mod['isConcurrenceError'])
    const client = new mod['AmigoClient']({ apiKey: 'test-key', workspaceId: 'ws-001' })
    expect(client).toBeInstanceOf(mod['ConcurrenceClient'])
    expect(new mod['NotFoundError']('missing')).toBeInstanceOf(mod['AmigoError'])
  })
})

describe('CJS exports', () => {
  it('exports ConcurrenceClient', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(resolve(ROOT, 'dist/index.cjs')) as Record<string, any>
    expect(mod['ConcurrenceClient'] ?? mod['default']?.['ConcurrenceClient']).toBeDefined()
  })

  it('keeps deprecated Amigo* aliases as the same references', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imported = await import(resolve(ROOT, 'dist/index.cjs')) as Record<string, any>
    const mod = imported['ConcurrenceClient'] ? imported : imported['default']
    expect(mod['AmigoClient']).toBe(mod['ConcurrenceClient'])
    expect(mod['AmigoError']).toBe(mod['ConcurrenceError'])
    expect(mod['isAmigoError']).toBe(mod['isConcurrenceError'])
  })
})
