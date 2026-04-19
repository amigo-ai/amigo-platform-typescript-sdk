import fs from 'node:fs'
import { resolveRepoPath } from './lib/repo-paths.mjs'

const distDir = resolveRepoPath('dist')

fs.rmSync(distDir, { recursive: true, force: true })
