/**
 * Generate TypeScript types from the platform OpenAPI spec.
 *
 * Sources (in priority order):
 *   1. Explicit --spec path/to/spec.json
 *   2. Explicit --url https://...
 *   3. Committed repo snapshot: openapi.json
 *   4. Local sibling repo: ../platform/services/platform-api/openapi.json
 *   5. Live production API: https://api.platform.amigo.ai/v1/openapi.json
 *
 * The default path is intentionally deterministic for public builds: if
 * `openapi.json` is committed in this repo, builds do not depend on local
 * sibling checkouts or live network state.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.resolve(__dirname, '../src/generated/api.ts')
const REPO_SPEC = path.resolve(__dirname, '../openapi.json')
const SIBLING_SPEC = path.resolve(__dirname, '../../platform/services/platform-api/openapi.json')
const DEFAULT_SPEC_URL = 'https://api.platform.amigo.ai/v1/openapi.json'

const args = process.argv.slice(2)

function getArgValue(name) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

function resolveSpecSource() {
  const specArg = getArgValue('--spec')
  const urlArg = getArgValue('--url')

  if (specArg) {
    const resolvedPath = path.resolve(specArg)
    console.log(`Using explicit spec: ${resolvedPath}`)
    return resolvedPath
  }

  if (urlArg) {
    console.log(`Using explicit URL: ${urlArg}`)
    return urlArg
  }

  if (fs.existsSync(REPO_SPEC)) {
    console.log(`Using committed spec snapshot: ${REPO_SPEC}`)
    return REPO_SPEC
  }

  if (fs.existsSync(SIBLING_SPEC)) {
    console.log(`Committed spec not found, using sibling repo spec: ${SIBLING_SPEC}`)
    return SIBLING_SPEC
  }

  console.log(`Committed spec not found, using live API: ${DEFAULT_SPEC_URL}`)
  return DEFAULT_SPEC_URL
}

async function loadSpec(specSource) {
  if (specSource.startsWith('http')) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetch(specSource, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  }

  return JSON.parse(fs.readFileSync(specSource, 'utf-8'))
}

function patchOpenApiDocument(input) {
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

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        value.forEach(fixDiscriminatorMappings)
      } else if (typeof value === 'object' && value !== null) {
        fixDiscriminatorMappings(value)
      }
    }
  }

  fixDiscriminatorMappings(input)

  const seenOperationIds = new Map()
  for (const [, pathItem] of Object.entries(input.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (typeof operation !== 'object' || !operation.operationId) continue

      const { operationId } = operation
      if (seenOperationIds.has(operationId)) {
        operation.operationId = `${operationId}-${method}`
      } else {
        seenOperationIds.set(operationId, true)
      }
    }
  }

  for (const [pathKey, pathItem] of Object.entries(input.paths ?? {})) {
    const templateParams = [...pathKey.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
    if (templateParams.length === 0) continue

    for (const [, operation] of Object.entries(pathItem)) {
      if (typeof operation !== 'object' || !operation.responses) continue

      if (!operation.parameters) {
        operation.parameters = []
      }

      for (const paramName of templateParams) {
        const exists = operation.parameters.some(
          (param) => param.name === paramName && param.in === 'path'
        )

        if (!exists) {
          operation.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' },
          })
        }
      }
    }
  }

  return input
}

const specSource = resolveSpecSource()
console.log(`Generating types from: ${specSource}`)

const input = patchOpenApiDocument(await loadSpec(specSource))
const ast = await openapiTS(input, { defaultNonNullable: false })
const code = astToString(ast)

const outDir = path.dirname(OUT_FILE)
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

fs.writeFileSync(OUT_FILE, code)

const pathCount = Object.keys(input.paths ?? {}).length
const schemaCount = Object.keys(input.components?.schemas ?? {}).length
console.log(`Generated ${OUT_FILE}: ${pathCount} paths, ${schemaCount} schemas`)
