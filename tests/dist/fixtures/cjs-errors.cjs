const sdk = require('../../../dist/index.cjs')

const error = new sdk.AuthenticationError('bad credentials')

if (!(error instanceof sdk.ConcurrenceError)) {
  throw new Error('AuthenticationError does not extend ConcurrenceError')
}

if (!sdk.isConcurrenceError(error)) {
  throw new Error('isConcurrenceError rejected AuthenticationError')
}

console.log('CJS errors: OK')
