/**
 * Generate TypeScript types from the platform-api OpenAPI spec.
 *
 * Sources (in priority order):
 *   1. Local sibling repo:  ../platform/services/platform-api/openapi.json
 *   2. Live staging API:    https://internal-api.platform.amigo.ai/v1/openapi.json
 *   3. Live production API: https://api.platform.amigo.ai/v1/openapi.json
 *
 * Usage:
 *   node scripts/gen-types.mjs                          # auto-detect source
 *   node scripts/gen-types.mjs --spec path/to/spec.json # explicit local file
 *   node scripts/gen-types.mjs --url https://...        # explicit URL
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.resolve(__dirname, '../src/generated/api.ts')

// Parse args
const args = process.argv.slice(2)
let specSource

const specArgIdx = args.indexOf('--spec')
const urlArgIdx = args.indexOf('--url')

if (specArgIdx !== -1 && args[specArgIdx + 1]) {
  specSource = path.resolve(args[specArgIdx + 1])
} else if (urlArgIdx !== -1 && args[urlArgIdx + 1]) {
  specSource = args[urlArgIdx + 1]
} else {
  // Auto-detect: prefer local committed spec from sibling platform repo
  const localSpec = path.resolve(__dirname, '../../platform/services/platform-api/openapi.json')
  if (fs.existsSync(localSpec)) {
    specSource = localSpec
    console.log(`Using local spec: ${localSpec}`)
  } else {
    specSource = 'https://api.platform.amigo.ai/v1/openapi.json'
    console.log(`Local spec not found, using live API: ${specSource}`)
  }
}

console.log(`Generating types from: ${specSource}`)

// Resolve spec (local file or URL)
let input
if (specSource.startsWith('http')) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(specSource, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    input = await res.json()
  } finally {
    clearTimeout(timeout)
  }
} else {
  input = JSON.parse(fs.readFileSync(specSource, 'utf-8'))
}

// Fix broken discriminator mappings (references to non-existent schemas)
const existingSchemas = new Set(Object.keys(input.components?.schemas ?? {}))
function fixDiscriminatorMappings(obj) {
  if (!obj || typeof obj !== 'object') return
  if (obj.discriminator?.mapping) {
    for (const [key, ref] of Object.entries(obj.discriminator.mapping)) {
      if (!existingSchemas.has(ref.replace('#/components/schemas/', ''))) {
        delete obj.discriminator.mapping[key]
      }
    }
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) val.forEach(fixDiscriminatorMappings)
    else if (typeof val === 'object' && val !== null) fixDiscriminatorMappings(val)
  }
}
fixDiscriminatorMappings(input)

// Fix duplicate operationIds (FastAPI generates collisions for overloaded routes)
const seenOps = new Map()
for (const [, pathItem] of Object.entries(input.paths ?? {})) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (typeof op !== 'object' || !op.operationId) continue
    const id = op.operationId
    if (seenOps.has(id)) {
      op.operationId = `${id}-${method}`
    } else {
      seenOps.set(id, true)
    }
  }
}

// FastAPI injects workspace_id, agent_id, etc. via Depends() so they're
// missing from the spec's operation parameters. Patch all operations to
// declare path params that appear in their URL template.
for (const [pathKey, pathItem] of Object.entries(input.paths ?? {})) {
  const templateParams = [...pathKey.matchAll(/\{(\w+)\}/g)].map(m => m[1])
  if (templateParams.length === 0) continue

  for (const [, op] of Object.entries(pathItem)) {
    if (typeof op !== 'object' || !op.responses) continue
    if (!op.parameters) op.parameters = []
    for (const paramName of templateParams) {
      const exists = op.parameters.some(p => p.name === paramName && p.in === 'path')
      if (!exists) {
        op.parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
      }
    }
  }
}

// Generate TypeScript
const ast = await openapiTS(input, { defaultNonNullable: false })
let code = astToString(ast)

// Note: FastAPI prefixes some inline schemas with src__routes__module__
// We keep these prefixes to avoid name collisions with components/schemas.
// Consumers should use components['schemas']['SchemaName'] which are always clean.

// Ensure output directory exists
const outDir = path.dirname(OUT_FILE)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(OUT_FILE, code)

const pathCount = Object.keys(input.paths ?? {}).length
const schemaCount = Object.keys(input.components?.schemas ?? {}).length
console.log(`Generated ${OUT_FILE}: ${pathCount} paths, ${schemaCount} schemas`)
