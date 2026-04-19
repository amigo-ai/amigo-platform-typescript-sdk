import { AmigoError, WebhookVerificationError, isAmigoError } from '../../../dist/index.mjs'

const amigoError = new AmigoError('test message')
if (!(amigoError instanceof Error)) {
  throw new Error('AmigoError should be instanceof Error')
}

const webhookError = new WebhookVerificationError('invalid webhook')
if (!(webhookError instanceof Error)) {
  throw new Error('WebhookVerificationError should be instanceof Error')
}

if (!isAmigoError(amigoError)) {
  throw new Error('isAmigoError should return true for AmigoError')
}

if (isAmigoError(new Error('plain'))) {
  throw new Error('isAmigoError should return false for plain Error')
}

console.log('ESM errors: OK')
