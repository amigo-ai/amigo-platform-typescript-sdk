import * as esbuild from 'esbuild'

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  external: [
    'openapi-fetch',
    'node:crypto',
    'node:os',
    'node:path',
    'node:fs/promises',
    'node:child_process',
    'node:util',
  ],
  target: 'node20',
}

await Promise.all([
  // ESM bundle
  esbuild.build({
    ...shared,
    format: 'esm',
    outfile: 'dist/index.mjs',
  }),
  // CJS bundle
  esbuild.build({
    ...shared,
    format: 'cjs',
    outfile: 'dist/index.cjs',
  }),
])

console.log('esbuild: built ESM and CJS bundles')
