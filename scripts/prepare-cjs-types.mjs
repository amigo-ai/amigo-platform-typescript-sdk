import fs from 'node:fs'
import path from 'node:path'
import { resolveRepoPath } from './lib/repo-paths.mjs'

const typesDir = resolveRepoPath('dist/types')
const esmTypesPath = path.join(typesDir, 'index.d.ts')
const cjsTypesPath = path.join(typesDir, 'index.d.cts')
const esmMapPath = path.join(typesDir, 'index.d.ts.map')
const cjsMapPath = path.join(typesDir, 'index.d.cts.map')

if (!fs.existsSync(esmTypesPath)) {
  throw new Error(`Missing declaration entrypoint: ${esmTypesPath}`)
}

const esmTypes = fs.readFileSync(esmTypesPath, 'utf8')
// tsc emits one public declaration entrypoint for this package. Under
// TypeScript NodeNext resolution, .d.cts is the CommonJS declaration entrypoint
// while relative .js import specifiers still point at the emitted JavaScript
// names; the tarball CJS fixture verifies this with skipLibCheck disabled.
fs.writeFileSync(
  cjsTypesPath,
  esmTypes.replace('//# sourceMappingURL=index.d.ts.map', '//# sourceMappingURL=index.d.cts.map'),
)

if (fs.existsSync(esmMapPath)) {
  const sourceMap = JSON.parse(fs.readFileSync(esmMapPath, 'utf8'))
  sourceMap.file = 'index.d.cts'
  fs.writeFileSync(cjsMapPath, `${JSON.stringify(sourceMap)}\n`)
}

console.log('types: wrote CJS declaration entrypoint')
