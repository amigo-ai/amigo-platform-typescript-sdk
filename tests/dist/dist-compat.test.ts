import { beforeAll, describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const fixturesDir = resolve(__dirname, 'fixtures')
const cjsDistPath = resolve(rootDir, 'dist/index.cjs')
const esmDistPath = resolve(rootDir, 'dist/index.mjs')

function runFixture(fixtureName: string): string {
  return execFileSync('node', [resolve(fixturesDir, fixtureName)], {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

describe('Distribution Compatibility', () => {
  beforeAll(() => {
    if (!existsSync(cjsDistPath)) {
      throw new Error(
        'dist/index.cjs not found. Run `npm run build` first before running dist tests.',
      )
    }

    if (!existsSync(esmDistPath)) {
      throw new Error(
        'dist/index.mjs not found. Run `npm run build` first before running dist tests.',
      )
    }
  })

  describe('CJS', () => {
    test('can be required and exposes direct exports', () => {
      expect(runFixture('cjs-exports.cjs').trim()).toBe('CJS exports: OK')
    })

    test('can instantiate AmigoClient', () => {
      expect(runFixture('cjs-instantiate.cjs').trim()).toBe('CJS instantiation: OK')
    })

    test('can use error exports', () => {
      expect(runFixture('cjs-errors.cjs').trim()).toBe('CJS errors: OK')
    })
  })

  describe('ESM', () => {
    test('can be imported and exposes direct exports', () => {
      expect(runFixture('esm-exports.mjs').trim()).toBe('ESM exports: OK')
    })

    test('can instantiate AmigoClient', () => {
      expect(runFixture('esm-instantiate.mjs').trim()).toBe('ESM instantiation: OK')
    })

    test('can use error exports', () => {
      expect(runFixture('esm-errors.mjs').trim()).toBe('ESM errors: OK')
    })
  })
})
