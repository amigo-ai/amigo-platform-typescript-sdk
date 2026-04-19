import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(scriptFile)

export const REPO_ROOT = path.resolve(scriptDir, '../..')

export function resolveRepoPath(...segments) {
  return assertWithinRoots(path.resolve(REPO_ROOT, ...segments), [REPO_ROOT], 'repository path')
}

export function resolveAllowedFile(candidatePath, allowedRoots, label = 'file') {
  const resolvedPath = fs.realpathSync(path.resolve(REPO_ROOT, candidatePath))
  const stats = fs.statSync(resolvedPath)

  if (!stats.isFile()) {
    throw new Error(`${label} must point to a file: ${resolvedPath}`)
  }

  return assertWithinRoots(resolvedPath, allowedRoots, label)
}

export function assertWithinRoots(candidatePath, allowedRoots, label = 'path') {
  const resolvedTarget = normalizePath(candidatePath)
  const normalizedRoots = allowedRoots.map((root) => normalizePath(root))
  const allowed = normalizedRoots.some((root) => isWithinRoot(resolvedTarget, root))

  if (!allowed) {
    throw new Error(`${label} must stay within one of the allowed roots: ${resolvedTarget}`)
  }

  return resolvedTarget
}

function isWithinRoot(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function normalizePath(candidatePath) {
  return fs.existsSync(candidatePath) ? fs.realpathSync(candidatePath) : path.resolve(candidatePath)
}
