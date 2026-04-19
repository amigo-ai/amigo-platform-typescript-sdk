/**
 * Refresh the committed OpenAPI snapshot at repo root.
 *
 * Sources (in priority order):
 *   1. Explicit --spec path/to/spec.json
 *   2. Explicit --url https://...
 *   3. Local sibling repo: ../platform/services/platform-api/openapi.json
 *   4. Live production API: https://api.platform.amigo.ai/v1/openapi.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.resolve(__dirname, '../openapi.json')
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

  if (specArg) return path.resolve(specArg)
  if (urlArg) return urlArg
  if (fs.existsSync(SIBLING_SPEC)) return SIBLING_SPEC
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

const specSource = resolveSpecSource()
console.log(`Syncing OpenAPI snapshot from: ${specSource}`)

const document = await loadSpec(specSource)
fs.writeFileSync(OUT_FILE, `${JSON.stringify(document, null, 2)}\n`)

console.log(`Wrote ${OUT_FILE}`)
