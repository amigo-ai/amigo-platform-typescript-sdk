import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(scriptFile)
const NULL_BYTE_PATTERN = /\0/

export const REPO_ROOT = path.resolve(scriptDir, '../..')

export function resolveRepoPath(...segments) {
  return assertWithinRoots(path.resolve(REPO_ROOT, ...segments), [REPO_ROOT], 'repository path')
}

export function resolveAllowedFile(candidatePath, allowedRoots, label = 'file') {
  const requestedPath = resolveCandidatePath(candidatePath, label)
  const normalizedRequestedPath = assertWithinRoots(requestedPath, allowedRoots, `${label} path`)
  const resolvedPath = fs.realpathSync(normalizedRequestedPath)
  const normalizedResolvedPath = assertWithinRoots(resolvedPath, allowedRoots, label)
  const stats = fs.statSync(normalizedResolvedPath)

  if (!stats.isFile()) {
    throw new Error(`${label} must point to a file: ${normalizedResolvedPath}`)
  }

  return normalizedResolvedPath
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

function resolveCandidatePath(candidatePath, label) {
  if (typeof candidatePath !== 'string' || candidatePath.trim() === '') {
    throw new Error(`${label} path is required`)
  }

  if (NULL_BYTE_PATTERN.test(candidatePath)) {
    throw new Error(`${label} path contains an invalid null byte`)
  }

  return path.resolve(REPO_ROOT, candidatePath)
}
