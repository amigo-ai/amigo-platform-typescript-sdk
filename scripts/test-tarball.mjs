import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'amigo-sdk-tarball-'))
const npmCacheDir = path.join(tempRoot, 'npm-cache')
const execEnv = { ...process.env, npm_config_cache: npmCacheDir }

let tarballPath

try {
  const [packInfo] = JSON.parse(
    execFileSync('npm', ['pack', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: execEnv,
    }),
  )
  tarballPath = path.join(ROOT, packInfo.filename)

  const unpackDir = path.join(tempRoot, 'unpacked')
  fs.mkdirSync(unpackDir, { recursive: true })
  execFileSync('tar', ['-xzf', tarballPath, '-C', unpackDir])

  const packageDir = path.join(unpackDir, 'package')
  assertPackagedFiles(packageDir)

  runFixture({
    packageDir,
    fixtureDir: path.join(tempRoot, 'esm-fixture'),
    entryFile: 'index.mjs',
    source: [
      "import { AmigoClient, parseRateLimitHeaders } from '@amigo-ai/platform-sdk'",
      '',
      "const client = new AmigoClient({ apiKey: 'test-key', workspaceId: 'ws-001' })",
      '',
      "if (!client.agents || typeof parseRateLimitHeaders !== 'function') {",
      "  throw new Error('ESM smoke test failed')",
      '}',
      '',
      "console.log('esm smoke ok')",
      '',
    ].join('\n'),
  })

  runFixture({
    packageDir,
    fixtureDir: path.join(tempRoot, 'cjs-fixture'),
    entryFile: 'index.cjs',
    source: [
      "const { AmigoClient, parseRateLimitHeaders } = require('@amigo-ai/platform-sdk')",
      '',
      "const client = new AmigoClient({ apiKey: 'test-key', workspaceId: 'ws-001' })",
      '',
      "if (!client.agents || typeof parseRateLimitHeaders !== 'function') {",
      "  throw new Error('CJS smoke test failed')",
      '}',
      '',
      "console.log('cjs smoke ok')",
      '',
    ].join('\n'),
  })

  console.log('tarball smoke tests passed')
} finally {
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.rmSync(tarballPath, { force: true })
  }

  fs.rmSync(tempRoot, { recursive: true, force: true })
}

function assertPackagedFiles(packageDir) {
  const required = [
    'dist/index.mjs',
    'dist/index.cjs',
    'dist/types/index.d.ts',
    'README.md',
    'api.md',
    'package.json',
  ]

  for (const relativePath of required) {
    const absolutePath = path.join(packageDir, relativePath)
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Packed artifact is missing ${relativePath}`)
    }
  }
}

function runFixture({ packageDir, fixtureDir, entryFile, source }) {
  const sdkDir = path.join(fixtureDir, 'node_modules/@amigo-ai/platform-sdk')
  const nodeModulesDir = path.join(fixtureDir, 'node_modules')

  fs.mkdirSync(path.dirname(sdkDir), { recursive: true })
  fs.mkdirSync(nodeModulesDir, { recursive: true })
  fs.cpSync(packageDir, sdkDir, { recursive: true })
  linkRuntimeDependency(nodeModulesDir, 'openapi-fetch')
  linkRuntimeDependency(nodeModulesDir, 'openapi-typescript-helpers')

  fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({}, null, 2))
  fs.writeFileSync(path.join(fixtureDir, entryFile), source)

  execFileSync(process.execPath, [entryFile], {
    cwd: fixtureDir,
    stdio: 'inherit',
  })
}

function linkRuntimeDependency(nodeModulesDir, packageName) {
  const sourceDir = path.join(ROOT, 'node_modules', packageName)
  const targetDir = path.join(nodeModulesDir, packageName)

  fs.mkdirSync(path.dirname(targetDir), { recursive: true })
  fs.symlinkSync(sourceDir, targetDir, 'dir')
}
