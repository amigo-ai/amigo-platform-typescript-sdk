import * as sdk from '../../../dist/index.mjs'

const error = new sdk.AuthenticationError('bad credentials')

if (!(error instanceof sdk.AmigoError)) {
  throw new Error('AuthenticationError does not extend AmigoError')
}

if (!sdk.isAmigoError(error)) {
  throw new Error('isAmigoError rejected AuthenticationError')
}

console.log('ESM errors: OK')
