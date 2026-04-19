import { describe, it, expect } from 'vitest'
import {
  AmigoError,
  BadRequestError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServerError,
  ConfigurationError,
  isAmigoError,
  isNotFoundError,
  isRateLimitError,
  isAuthenticationError,
  createApiError,
} from '../../src/core/errors.js'

describe('Error hierarchy', () => {
  it('all SDK errors extend AmigoError', () => {
    expect(new BadRequestError('bad')).toBeInstanceOf(AmigoError)
    expect(new AuthenticationError('auth')).toBeInstanceOf(AmigoError)
    expect(new PermissionError('perm')).toBeInstanceOf(AmigoError)
    expect(new NotFoundError('nf')).toBeInstanceOf(AmigoError)
    expect(new ConflictError('conflict')).toBeInstanceOf(AmigoError)
    expect(new ValidationError('val')).toBeInstanceOf(AmigoError)
    expect(new RateLimitError('rate')).toBeInstanceOf(AmigoError)
    expect(new ServerError('server')).toBeInstanceOf(AmigoError)
    expect(new ConfigurationError('config')).toBeInstanceOf(AmigoError)
  })

  it('sets correct status codes', () => {
    expect(new BadRequestError('').statusCode).toBe(400)
    expect(new AuthenticationError('').statusCode).toBe(401)
    expect(new PermissionError('').statusCode).toBe(403)
    expect(new NotFoundError('').statusCode).toBe(404)
    expect(new ConflictError('').statusCode).toBe(409)
    expect(new ValidationError('').statusCode).toBe(422)
    expect(new RateLimitError('').statusCode).toBe(429)
  })

  it('sets error context fields', () => {
    const err = new NotFoundError('Resource not found', {
      errorCode: 'resource_not_found',
      requestId: 'req-123',
      detail: 'The agent was not found',
    })
    expect(err.errorCode).toBe('resource_not_found')
    expect(err.requestId).toBe('req-123')
    expect(err.detail).toBe('The agent was not found')
  })

  it('RateLimitError stores retryAfter', () => {
    const err = new RateLimitError('Too many requests', { retryAfter: 30 })
    expect(err.retryAfter).toBe(30)
  })
})

describe('Type guards', () => {
  it('isAmigoError', () => {
    expect(isAmigoError(new NotFoundError('x'))).toBe(true)
    expect(isAmigoError(new Error('x'))).toBe(false)
    expect(isAmigoError('string')).toBe(false)
  })

  it('isNotFoundError', () => {
    expect(isNotFoundError(new NotFoundError('x'))).toBe(true)
    expect(isNotFoundError(new ServerError('x'))).toBe(false)
  })

  it('isRateLimitError', () => {
    expect(isRateLimitError(new RateLimitError('x'))).toBe(true)
    expect(isRateLimitError(new NotFoundError('x'))).toBe(false)
  })

  it('isAuthenticationError', () => {
    expect(isAuthenticationError(new AuthenticationError('x'))).toBe(true)
    expect(isAuthenticationError(new PermissionError('x'))).toBe(false)
  })
})

describe('ConfigurationError from AmigoClient', () => {
  it('throws on missing apiKey', async () => {
    const { AmigoClient } = await import('../../src/index.js')
    expect(
      () => new AmigoClient({ apiKey: '', workspaceId: 'ws-001' }),
    ).toThrow(ConfigurationError)
  })

  it('throws on missing workspaceId', async () => {
    const { AmigoClient } = await import('../../src/index.js')
    expect(
      () => new AmigoClient({ apiKey: 'key', workspaceId: '' }),
    ).toThrow(ConfigurationError)
  })
})

describe('createApiError', () => {
  it('uses x-request-id when the response body omits request_id', async () => {
    const error = await createApiError(
      new Response(JSON.stringify({ detail: 'Missing agent' }), {
        status: 404,
        headers: { 'x-request-id': 'req-header-123' },
      }),
    )

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.requestId).toBe('req-header-123')
  })

  it('redacts sensitive values from serialized context', async () => {
    const error = await createApiError(
      new Response(
        JSON.stringify({
          message: 'bad request',
          access_token: 'secret-token',
          nested: { api_key: 'secret-key' },
        }),
        { status: 400 },
      ),
    )

    expect(error.toJSON()).toMatchObject({
      context: {
        response: {
          access_token: '[REDACTED]',
          nested: { api_key: '[REDACTED]' },
        },
      },
    })
  })
})
