import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GENERATED_TYPES_PATH = join(__dirname, '..', 'src', 'generated', 'api.ts')

function extractTypeNames(content: string): string[] {
  const typeRegex = /export\s+(?:type|interface)\s+(\w+)/g
  const names: string[] = []
  let match: RegExpExecArray | null

  while ((match = typeRegex.exec(content)) !== null) {
    names.push(match[1]!)
  }

  return names.sort()
}

function extractOperationIds(content: string): string[] {
  const operationRegex = /"([a-z][\w-]+)":\s*\{/g
  const operationIds: string[] = []
  let match: RegExpExecArray | null

  const operationsSection = content.match(/export interface operations\s*\{([\s\S]*?)^\}/m)
  if (!operationsSection) return operationIds

  while ((match = operationRegex.exec(operationsSection[1]!)) !== null) {
    operationIds.push(match[1]!)
  }

  return operationIds.sort()
}

describe('Generated type snapshots', () => {
  const content = readFileSync(GENERATED_TYPES_PATH, 'utf8')

  it('keeps exported type names stable', () => {
    expect(extractTypeNames(content)).toMatchSnapshot()
  })

  it('keeps operation IDs stable', () => {
    expect(extractOperationIds(content)).toMatchSnapshot()
  })

  it('exports the expected OpenAPI root interfaces', () => {
    expect(content).toContain('export interface components')
    expect(content).toContain('export interface operations')
    expect(content).toContain('export interface paths')
  })
})
