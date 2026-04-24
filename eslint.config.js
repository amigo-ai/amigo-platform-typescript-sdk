import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

const runtimeGlobals = {
  AbortController: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  URL: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  fetch: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
}

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, prettier, {
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: runtimeGlobals,
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignores: ['dist/', 'node_modules/'],
})
