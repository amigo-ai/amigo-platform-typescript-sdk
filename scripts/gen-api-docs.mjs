import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INDEX_FILE = path.join(ROOT, 'src/index.ts')
const RESOURCES_DIR = path.join(ROOT, 'src/resources')
const OUTPUT_FILE = path.join(ROOT, 'api.md')
const CHECK_MODE = process.argv.includes('--check')

const resourceFiles = fs
  .readdirSync(RESOURCES_DIR)
  .filter((file) => file.endsWith('.ts') && file !== 'base.ts')
  .sort()

const indexSource = loadSource(INDEX_FILE)
const resourceClassMap = new Map(
  resourceFiles
    .map((file) => {
      const fullPath = path.join(RESOURCES_DIR, file)
      const source = loadSource(fullPath)
      const classDeclaration = source.statements.find(ts.isClassDeclaration)
      if (!classDeclaration?.name) {
        return null
      }

      return [
        classDeclaration.name.text,
        {
          file,
          methods: collectResourceMethods(classDeclaration),
        },
      ]
    })
    .filter(Boolean),
)

const clientConfigFields = collectInterfaceFields(indexSource, 'AmigoClientConfig')
const clientClass = getClass(indexSource, 'AmigoClient')
const clientFields = collectPublicClassFields(clientClass)
const clientMethods = collectPublicMethodNames(clientClass).filter(
  (name) => name === 'withOptions' || name === name.toUpperCase(),
)
const exportMap = collectExportMap(indexSource)
const conversationHelperExports = requireExportNames(
  exportMap.values,
  './resources/conversations.js',
)
const conversationTypeExports = requireExportNames(exportMap.types, './resources/conversations.js')
const resourceEntries = clientFields
  .filter((field) => !['workspaceId', 'baseUrl'].includes(field.name))
  .map((field) => {
    const methods = resourceClassMap.get(field.typeText)?.methods ?? []
    return {
      name: field.name,
      methods,
    }
  })

const markdown = await prettier.format(
  [
    '# API Surface',
    '',
    '> Generated from source. Do not edit directly.',
    '',
    'Repo-local reference for the public TypeScript SDK surface. This document complements the product docs and stays focused on the package exports that ship from this repository.',
    '',
    '## Client',
    '',
    '### `AmigoClient`',
    '',
    'Configuration fields:',
    ...clientConfigFields.map(
      (field) => `- \`${field.name}${field.optional ? '?' : ''}: ${field.typeText}\``,
    ),
    '',
    'Instance fields:',
    ...clientFields
      .filter((field) => ['workspaceId', 'baseUrl'].includes(field.name))
      .map((field) => `- \`${field.name}: ${field.typeText}\``),
    '',
    'Client methods:',
    ...clientMethods.map((method) =>
      method === 'withOptions' ? '- `withOptions(options)`' : `- \`${method}(path, options?)\``,
    ),
    '',
    'Notes:',
    '- Workspace-scoped paths receive the configured `workspaceId` automatically, and the configured value wins if `workspace_id` is provided manually.',
    '- `client.withOptions(options)` and `client.<resource>.withOptions(options)` layer headers, timeout, and retry overrides onto the normal resource surface.',
    '- Low-level helpers return `AmigoResponse<T>` with `data`, `response`, `requestId`, and `rateLimit`.',
    '- Object responses from resource methods include `_request_id` and `lastResponse` metadata.',
    '',
    '## Core exports',
    '',
    `- Errors: ${formatNames(filterNames(exportMap.values.get('./core/errors.js'), (name) => !name.startsWith('is')))}`,
    `- Error guards: ${formatNames(filterNames(exportMap.values.get('./core/errors.js'), (name) => name.startsWith('is')))}`,
    `- Request option types: ${formatNames(exportMap.types.get('./core/request-options.js'))}`,
    `- Webhooks: ${formatNames(exportMap.values.get('./core/webhooks.js'))}`,
    `- Pagination and response helpers: ${formatNames(exportMap.values.get('./core/utils.js'))}`,
    `- Conversation helpers: ${formatNames(conversationHelperExports)}`,
    `- Conversation types: ${formatConversationTypeNames(conversationTypeExports)}`,
    `- Response and hook types: ${formatNames(
      [
        ...(exportMap.types.get('./core/utils.js') ?? []),
        ...(exportMap.types.get('./core/retry.js') ?? []),
        ...(exportMap.types.get('./core/rate-limit.js') ?? []),
        ...(exportMap.types.get('./core/openapi-client.js') ?? []),
      ].filter((name) => name !== 'paths' && name !== 'components' && name !== 'operations'),
    )}`,
    `- Generated OpenAPI types: ${formatNames(exportMap.types.get('./generated/api.js'))}`,
    '- Generated API types are produced with `npm run gen-types` from the committed `openapi.json` snapshot.',
    '- The generated OpenAPI types may include spec-only endpoints that do not yet have resource wrappers; use the low-level `GET`/`POST`/`PUT`/`PATCH`/`DELETE` helpers for those operations until a dedicated resource is added. Current spec-only groups include `/use-cases` and `/voicemail`.',
    '',
    '## Resources',
    '',
    'All workspace-scoped resources also expose `withOptions(options)`.',
    '',
    ...resourceEntries.flatMap((resource) => [
      `### \`${resource.name}\``,
      '',
      ...resource.methods.map((method) => `- \`${method}\``),
      '',
    ]),
  ].join('\n'),
  { parser: 'markdown' },
)

if (CHECK_MODE) {
  const current = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : ''
  if (current !== markdown) {
    console.error('api.md is out of date. Run `npm run docs:api`.')
    process.exit(1)
  }
} else {
  fs.writeFileSync(OUTPUT_FILE, markdown)
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`)
}

function loadSource(filePath) {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
}

function getClass(sourceFile, className) {
  const classDeclaration = sourceFile.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === className,
  )

  if (!classDeclaration) {
    throw new Error(`Class ${className} not found in ${sourceFile.fileName}`)
  }

  return classDeclaration
}

function collectInterfaceFields(sourceFile, interfaceName) {
  const declaration = sourceFile.statements.find(
    (statement) => ts.isInterfaceDeclaration(statement) && statement.name.text === interfaceName,
  )

  if (!declaration) {
    throw new Error(`Interface ${interfaceName} not found in ${sourceFile.fileName}`)
  }

  return declaration.members.filter(ts.isPropertySignature).map((member) => ({
    name: member.name.getText(sourceFile),
    optional: Boolean(member.questionToken),
    typeText: member.type?.getText(sourceFile) ?? 'unknown',
  }))
}

function collectPublicClassFields(classDeclaration) {
  return classDeclaration.members
    .filter(ts.isPropertyDeclaration)
    .filter((member) => !hasModifier(member, ts.SyntaxKind.PrivateKeyword))
    .map((member) => ({
      name: member.name.getText(classDeclaration.getSourceFile()).replace(/!/g, ''),
      typeText: member.type?.getText(classDeclaration.getSourceFile()) ?? 'unknown',
    }))
}

function collectPublicMethodNames(classDeclaration) {
  return classDeclaration.members
    .filter(ts.isMethodDeclaration)
    .filter((member) => !hasModifier(member, ts.SyntaxKind.PrivateKeyword))
    .map((member) => member.name.getText(classDeclaration.getSourceFile()))
}

function collectResourceMethods(classDeclaration) {
  const methods = []
  const sourceFile = classDeclaration.getSourceFile()

  for (const member of classDeclaration.members) {
    if (ts.isMethodDeclaration(member) && member.name.getText(sourceFile) !== 'constructor') {
      methods.push(member.name.getText(sourceFile))
      continue
    }

    if (!ts.isPropertyDeclaration(member) || !member.initializer) {
      continue
    }

    const propertyName = member.name.getText(sourceFile)
    if (!ts.isObjectLiteralExpression(member.initializer)) {
      continue
    }

    for (const property of member.initializer.properties) {
      if (
        (ts.isMethodDeclaration(property) || ts.isPropertyAssignment(property)) &&
        ts.isIdentifier(property.name)
      ) {
        methods.push(`${propertyName}.${property.name.text}`)
      }
    }
  }

  return methods
}

function collectExportMap(sourceFile) {
  const values = new Map()
  const types = new Map()

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !statement.exportClause
    ) {
      continue
    }

    const moduleName = statement.moduleSpecifier.getText(sourceFile).slice(1, -1)
    const target = statement.isTypeOnly ? types : values
    const entries = target.get(moduleName) ?? []

    if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        entries.push(element.name.text)
      }
    }

    target.set(moduleName, entries)
  }

  return { values, types }
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind))
}

function filterNames(names = [], predicate) {
  return names.filter(predicate)
}

function formatNames(names = []) {
  return names.map((name) => `\`${name}\``).join(', ')
}

function formatConversationTypeNames(names = []) {
  return names
    .map((name) =>
      name === 'TextStreamAuthProtocols'
        ? `\`${name}\` (WebSocket constructor subprotocol tuple)`
        : `\`${name}\``,
    )
    .join(', ')
}

function requireExportNames(map, moduleName) {
  const names = map.get(moduleName)
  if (!names?.length) {
    throw new Error(
      `Expected public exports from ${moduleName}; known modules: ${[...map.keys()].join(', ')}`,
    )
  }
  return names
}
