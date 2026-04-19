import { describe, test, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const fixturesDir = resolve(__dirname, 'fixtures')
const cjsDistPath = resolve(rootDir, 'dist/index.cjs')
const esmDistPath = resolve(rootDir, 'dist/index.mjs')

function runFixture(fixtureName: string): string {
  const fixturePath = resolve(fixturesDir, fixtureName)
  return execFileSync('node', [fixturePath], {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

describe('Distribution compatibility', () => {
  beforeAll(() => {
    if (!existsSync(cjsDistPath)) {
      throw new Error('dist/index.cjs not found. Run `npm run build` before dist tests.')
    }
    if (!existsSync(esmDistPath)) {
      throw new Error('dist/index.mjs not found. Run `npm run build` before dist tests.')
    }
  })

  describe('CJS', () => {
    test('exports are accessible', () => {
      expect(runFixture('cjs-exports.cjs').trim()).toBe('CJS exports: OK')
    })

    test('AmigoClient can be instantiated', () => {
      expect(runFixture('cjs-instantiate.cjs').trim()).toBe('CJS instantiation: OK')
    })

    test('error helpers work correctly', () => {
      expect(runFixture('cjs-errors.cjs').trim()).toBe('CJS errors: OK')
    })
  })

  describe('ESM', () => {
    test('exports are accessible', () => {
      expect(runFixture('esm-exports.mjs').trim()).toBe('ESM exports: OK')
    })

    test('AmigoClient can be instantiated', () => {
      expect(runFixture('esm-instantiate.mjs').trim()).toBe('ESM instantiation: OK')
    })

    test('error helpers work correctly', () => {
      expect(runFixture('esm-errors.mjs').trim()).toBe('ESM errors: OK')
    })
  })
})
