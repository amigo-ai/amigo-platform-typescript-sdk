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
  it('exports AmigoClient and error classes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(resolve(ROOT, 'dist/index.mjs')) as Record<string, any>
    expect(mod['AmigoClient']).toBeDefined()
    expect(typeof mod['AmigoClient']).toBe('function')
    expect(mod['AmigoError']).toBeDefined()
    expect(mod['NotFoundError']).toBeDefined()
    expect(mod['AuthenticationError']).toBeDefined()
  })

  it('AmigoClient can be instantiated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AmigoClient } = await import(resolve(ROOT, 'dist/index.mjs')) as Record<string, any>
    const client = new AmigoClient({ apiKey: 'test-key', workspaceId: 'ws-001' })
    expect(client.agents).toBeDefined()
    expect(client.skills).toBeDefined()
    expect(client.memory).toBeDefined()
    expect(client.world).toBeDefined()
  })
})

describe('CJS exports', () => {
  it('exports AmigoClient', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(resolve(ROOT, 'dist/index.cjs')) as Record<string, any>
    expect(mod['AmigoClient'] ?? mod['default']?.['AmigoClient']).toBeDefined()
  })
})
