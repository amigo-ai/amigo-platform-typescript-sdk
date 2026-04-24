import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SECTION_ORDER = [
  'Features',
  'Security',
  'Improvements',
  'Bug Fixes',
  'Documentation',
  'Maintenance',
]
const SECURITY_PATTERNS = [
  /\bsecurity\b/i,
  /\bvulnerability\b/i,
  /\bdependabot\b/i,
  /\badvisory\b/i,
  /\bcode scanning\b/i,
  /\bcode-scanning\b/i,
  /\bGHSA-\w+/i,
  /\bCVE-\d{4}-\d+\b/i,
  /\bpin(?:ned|ning)? third-party action/i,
]
const TITLE_REWRITES = [
  {
    pattern: /^sync types from platform spec.*$/i,
    replacement: 'Refresh generated SDK types from the committed Platform API spec',
  },
  {
    pattern: /^sync api types from platform spec.*$/i,
    replacement: 'Refresh generated SDK types from the committed Platform API spec',
  },
  {
    pattern: /^stabilize node 18 retry jitter and refine readme graphic$/i,
    replacement: 'Stabilize Node 18 retry handling and refine the README platform graphic',
  },
  {
    pattern: /^polish repo presentation and close security findings$/i,
    replacement: 'Polish the public repo surface and close security findings',
  },
]

const [mode, ...args] = process.argv.slice(2)

if (!['changelog', 'release-notes'].includes(mode)) {
  console.error(
    'Usage: node scripts/release-history.mjs <changelog|release-notes> [--from REF] [--to REF] [--version VERSION] [--repo owner/name]',
  )
  process.exit(1)
}

const options = parseArgs(args)
const toRef = options.to ?? 'HEAD'
const fromRef = resolveFromRef(options.from, toRef)
const version = options.version ?? 'Unreleased'
const repo = options.repo ?? getRepoSlug()
const commits = getCommits({ fromRef, toRef })
const sections = buildSections(commits.map(toEntry).filter(Boolean))

if (mode === 'changelog') {
  process.stdout.write(renderChangelog({ version, sections }) + '\n')
} else {
  process.stdout.write(renderReleaseNotes({ fromRef, version, repo, sections }) + '\n')
}

function parseArgs(argv) {
  const parsed = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]

    if (!arg.startsWith('--')) {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }

    if (!value || value.startsWith('--')) {
      console.error(`Missing value for ${arg}`)
      process.exit(1)
    }

    parsed[arg.slice(2)] = value
    index += 1
  }

  return parsed
}

function resolveFromRef(explicitFrom, toRef) {
  if (explicitFrom) {
    return explicitFrom
  }

  const tagRef = git(['describe', '--tags', '--abbrev=0', toRef], { allowFailure: true })
  if (tagRef) {
    return tagRef
  }

  return (
    git(
      [
        'log',
        '--first-parent',
        '--extended-regexp',
        '--grep',
        '^v[0-9]+\\.[0-9]+\\.[0-9]+$',
        '--format=%H',
        '-n',
        '1',
        toRef,
      ],
      { allowFailure: true },
    ) || ''
  )
}

function getCommits({ fromRef, toRef }) {
  const args = ['log', '--first-parent', '--format=%H%x1f%P%x1f%s%x1f%b%x1e']

  if (fromRef) {
    args.push(`${fromRef}..${toRef}`)
  } else {
    args.push(toRef)
  }

  const raw = git(args, { allowFailure: true })
  if (!raw) {
    return []
  }

  return raw
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, parents, subject, body] = record.split('\x1f')
      return {
        sha,
        parents,
        subject: subject.trim(),
        body: body.trim(),
      }
    })
}

function toEntry(commit) {
  if (!commit.subject || /^v[0-9]+\.[0-9]+\.[0-9]+$/.test(commit.subject)) {
    return null
  }

  const mergePullRequestMatch = commit.subject.match(/^Merge pull request #(\d+)/)
  let prNumber = mergePullRequestMatch?.[1] ?? commit.subject.match(/\(#(\d+)\)\s*$/)?.[1] ?? null
  let title = mergePullRequestMatch ? getMergeCommitTitle(commit.body) : commit.subject

  title = title
    .replace(/\s+\(#\d+\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!title) {
    return null
  }

  const conventionalMatch = title.match(
    /^(feat|fix|docs|refactor|perf|test|ci|build|chore)(\([^)]*\))?:\s+(.+)$/i,
  )

  if (conventionalMatch) {
    const normalizedTitle = normalizePublicTitle(conventionalMatch[3].trim())
    const section = classifySection({
      explicitType: conventionalMatch[1].toLowerCase(),
      title: normalizedTitle,
      body: commit.body,
    })

    return {
      prNumber,
      section,
      title: normalizedTitle,
      sha: commit.sha,
    }
  }

  const normalizedTitle = normalizePublicTitle(title)
  return {
    prNumber,
    section: classifySection({ explicitType: null, title: normalizedTitle, body: commit.body }),
    title: normalizedTitle,
    sha: commit.sha,
  }
}

function getMergeCommitTitle(body) {
  return (
    body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ''
  )
}

function mapSection(type) {
  if (type === 'feat') {
    return 'Features'
  }

  if (type === 'fix') {
    return 'Bug Fixes'
  }

  if (type === 'docs') {
    return 'Documentation'
  }

  if (type === 'refactor' || type === 'perf') {
    return 'Improvements'
  }

  return 'Maintenance'
}

function classifySection({ explicitType, title, body }) {
  if (matchesSecurity(title) || matchesSecurity(body)) {
    return 'Security'
  }

  if (explicitType) {
    return mapSection(explicitType)
  }

  return 'Improvements'
}

function matchesSecurity(value) {
  return SECURITY_PATTERNS.some((pattern) => pattern.test(value))
}

function normalizePublicTitle(title) {
  let normalizedTitle = title

  for (const { pattern, replacement } of TITLE_REWRITES) {
    if (pattern.test(normalizedTitle)) {
      normalizedTitle = replacement
      break
    }
  }

  return normalizedTitle.replace(/\s+/g, ' ').trim()
}

function buildSections(entries) {
  const groups = new Map(SECTION_ORDER.map((section) => [section, []]))

  for (const entry of entries) {
    groups.get(entry.section).push(entry)
  }

  return SECTION_ORDER.filter((section) => groups.get(section).length > 0).map((section) => ({
    title: section,
    entries: groups.get(section),
  }))
}

function renderChangelog({ version, sections }) {
  const lines = [`## [${version}] - ${new Date().toISOString().slice(0, 10)}`, '']

  if (sections.length === 0) {
    lines.push('### Maintenance', '', '- No public SDK changes were recorded in this release.', '')
    return lines.join('\n').trimEnd()
  }

  for (const section of sections) {
    lines.push(`### ${section.title}`, '')
    for (const entry of section.entries) {
      lines.push(`- ${formatChangelogEntry(entry)}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function renderReleaseNotes({ fromRef, version, repo, sections }) {
  const releaseTag = `v${version}`
  const lines = [`## What Changed in ${releaseTag}`, '']

  if (sections.length === 0) {
    lines.push('### Maintenance', '', '- No public SDK changes were recorded in this release.', '')
  } else {
    for (const section of sections) {
      lines.push(`### ${section.title}`, '')
      for (const entry of section.entries) {
        lines.push(`- ${formatReleaseEntry(entry, repo)}`)
      }
      lines.push('')
    }
  }

  if (fromRef) {
    lines.push('---', '')
    lines.push(
      `**Full Changelog**: https://github.com/${repo}/compare/${fromRef}...${releaseTag}`,
      '',
    )
  }

  lines.push(
    '### Installation',
    '',
    '```bash',
    `npm install @amigo-ai/platform-sdk@${version}`,
    '```',
  )

  return lines.join('\n').trimEnd()
}

function formatChangelogEntry(entry) {
  if (!entry.prNumber) {
    return entry.title
  }

  return `${entry.title} (#${entry.prNumber})`
}

function formatReleaseEntry(entry, repo) {
  if (entry.prNumber && repo) {
    return `${entry.title} ([#${entry.prNumber}](https://github.com/${repo}/pull/${entry.prNumber}))`
  }

  return `${entry.title} (${entry.sha.slice(0, 7)})`
}

function getRepoSlug() {
  const remote = git(['remote', 'get-url', 'origin'], { allowFailure: true })
  const normalized = remote.replace(/\.git$/, '')
  const sshMatch = normalized.match(/^git@github\.com:(.+)$/)

  if (sshMatch) {
    return sshMatch[1]
  }

  const httpsMatch = normalized.match(/^https:\/\/github\.com\/(.+)$/)
  return httpsMatch?.[1] ?? ''
}

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    if (allowFailure) {
      return ''
    }

    throw error
  }
}
