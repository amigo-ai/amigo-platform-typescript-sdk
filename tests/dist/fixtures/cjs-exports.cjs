'use strict'

const {
  AmigoClient,
  AmigoError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  NetworkError,
  WebhookVerificationError,
} = require('../../../dist/index.cjs')

if (typeof AmigoClient !== 'function') {
  throw new Error('AmigoClient should be a function, got: ' + typeof AmigoClient)
}

for (const [name, value] of Object.entries({
  AmigoError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  NetworkError,
  WebhookVerificationError,
})) {
  if (typeof value !== 'function') {
    throw new Error(name + ' should be exported directly')
  }
}

console.log('CJS exports: OK')
