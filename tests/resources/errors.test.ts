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
  NetworkError,
  RequestTimeoutError,
  isAmigoError,
  isNotFoundError,
  isRateLimitError,
  isAuthenticationError,
  isRequestTimeoutError,
  isPermissionError,
  isConflictError,
  isValidationError,
  isServerError,
  isNetworkError,
  isHttpException,
  isHttpValidationError,
  isUnparseableErrorBody,
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
    expect(new RequestTimeoutError('timeout', 1000)).toBeInstanceOf(AmigoError)
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

  it('isRequestTimeoutError', () => {
    expect(isRequestTimeoutError(new RequestTimeoutError('x', 1000))).toBe(true)
    expect(isRequestTimeoutError(new NetworkError('x'))).toBe(false)
  })
})

describe('ConfigurationError from AmigoClient', () => {
  it('throws on missing apiKey', async () => {
    const { AmigoClient } = await import('../../src/index.js')
    expect(() => new AmigoClient({ apiKey: '', workspaceId: 'ws-001' })).toThrow(ConfigurationError)
  })

  it('throws on missing workspaceId', async () => {
    const { AmigoClient } = await import('../../src/index.js')
    expect(() => new AmigoClient({ apiKey: 'key', workspaceId: '' })).toThrow(ConfigurationError)
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

  it('captures errorBody for FastAPI HTTPException shape', async () => {
    const error = await createApiError(
      new Response(JSON.stringify({ detail: 'Agent not found', error_code: 'agent_missing' }), {
        status: 404,
      }),
    )

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.errorBody).toEqual({ detail: 'Agent not found', error_code: 'agent_missing' })
    expect(isHttpException(error)).toBe(true)
    expect(isHttpValidationError(error)).toBe(false)
    expect(isUnparseableErrorBody(error)).toBe(false)
    if (isHttpException(error)) {
      // Type narrowed: errorBody.detail is string | object | array
      expect(error.errorBody.detail).toBe('Agent not found')
      expect(error.errorBody.error_code).toBe('agent_missing')
    }
  })

  it('captures errorBody for HTTPValidationError shape (FastAPI 422)', async () => {
    const error = await createApiError(
      new Response(
        JSON.stringify({
          detail: [
            { loc: ['body', 'name'], msg: 'field required', type: 'value_error.missing' },
            { loc: ['body', 'email'], msg: 'invalid email', type: 'value_error.email' },
          ],
        }),
        { status: 422 },
      ),
    )

    expect(error).toBeInstanceOf(ValidationError)
    expect(isHttpValidationError(error)).toBe(true)
    expect(isHttpException(error)).toBe(false)
    expect(isUnparseableErrorBody(error)).toBe(false)
    if (isHttpValidationError(error)) {
      // Type narrowed: errorBody.detail is ValidationError[]
      expect(error.errorBody.detail).toHaveLength(2)
      expect(error.errorBody.detail?.[0]?.loc).toEqual(['body', 'name'])
      expect(error.errorBody.detail?.[1]?.msg).toBe('invalid email')
    }
  })

  it('handles malformed JSON body without bubbling parse error', async () => {
    const error = await createApiError(
      new Response('<!DOCTYPE html>this is not json', {
        status: 502,
        statusText: 'Bad Gateway',
      }),
    )

    expect(error).toBeInstanceOf(ServerError)
    expect(error.statusCode).toBe(502)
    expect(isUnparseableErrorBody(error)).toBe(true)
    expect(isHttpException(error)).toBe(false)
    expect(isHttpValidationError(error)).toBe(false)
    if (isUnparseableErrorBody(error)) {
      expect(error.errorBody.detail).toBe('Bad Gateway')
      expect(error.errorBody.raw_body).toBe('<!DOCTYPE html>this is not json')
    }
    expect(error.rawBody).toBe('<!DOCTYPE html>this is not json')
  })

  it('handles empty body without throwing', async () => {
    const error = await createApiError(
      new Response('', { status: 500, statusText: 'Internal Server Error' }),
    )

    expect(error).toBeInstanceOf(ServerError)
    expect(isUnparseableErrorBody(error)).toBe(true)
    if (isUnparseableErrorBody(error)) {
      expect(error.errorBody.detail).toBe('Internal Server Error')
      expect(error.errorBody.raw_body).toBe('')
    }
    expect(error.rawBody).toBe('')
  })

  it('handles connection-drop mid-read without throwing', async () => {
    // Build a Response-like object with a rejecting text() to simulate
    // connection drop after status was read. We use a fake object instead
    // of a real Response since `Response.text` is read-only.
    const broken = {
      status: 503,
      statusText: 'Service Unavailable',
      url: 'https://api.example.com/x',
      headers: new Headers(),
      text: () => Promise.reject(new Error('connection reset by peer')),
    } as unknown as Response

    const error = await createApiError(broken)

    expect(error.statusCode).toBe(503)
    expect(isUnparseableErrorBody(error)).toBe(true)
    if (isUnparseableErrorBody(error)) {
      expect(error.errorBody.raw_body).toBe('')
    }
  })

  it('truncates oversized raw body to 8 KB', async () => {
    const huge = 'x'.repeat(100_000)
    const error = await createApiError(
      new Response(huge, { status: 500, statusText: 'Internal Server Error' }),
    )

    expect(error.rawBody?.length).toBe(8 * 1024)
    if (isUnparseableErrorBody(error)) {
      expect(error.errorBody.raw_body.length).toBe(8 * 1024)
    }
  })

  it('handles JSON body that parses to a non-object (e.g. literal null)', async () => {
    const error = await createApiError(
      new Response('null', { status: 500, statusText: 'Internal Server Error' }),
    )

    // JSON parsed but isn't object — surface as unparseable
    expect(isUnparseableErrorBody(error)).toBe(true)
    expect(isHttpException(error)).toBe(false)
  })

  it('preserves backward-compat fields on legacy error shape', async () => {
    const error = await createApiError(
      new Response(
        JSON.stringify({
          message: 'Legacy message',
          detail: 'Legacy detail',
          error_code: 'LEGACY_CODE',
          request_id: 'req-legacy-1',
        }),
        { status: 400 },
      ),
    )

    expect(error).toBeInstanceOf(BadRequestError)
    // Legacy flat fields still exposed
    expect(error.message).toBe('Legacy message')
    expect(error.detail).toBe('Legacy detail')
    expect(error.errorCode).toBe('LEGACY_CODE')
    expect(error.requestId).toBe('req-legacy-1')
    // And the typed body is also surfaced
    expect(isHttpException(error)).toBe(true)
    if (isHttpException(error)) {
      expect(error.errorBody.detail).toBe('Legacy detail')
      expect(error.errorBody.error_code).toBe('LEGACY_CODE')
    }
  })

  it('stringifies non-string detail values', async () => {
    const detailObj = { code: 'X', extra: { nested: true } }
    const error = await createApiError(
      new Response(JSON.stringify({ detail: detailObj }), { status: 400 }),
    )

    // Flat .detail is the JSON-stringified form for backward compat
    expect(error.detail).toBe(JSON.stringify(detailObj))
    // But errorBody.detail preserves the structure
    expect(isHttpException(error)).toBe(true)
    if (isHttpException(error)) {
      expect(error.errorBody.detail).toEqual(detailObj)
    }
  })
})

describe('Body type guards', () => {
  it('isHttpException — false on non-AmigoError', () => {
    expect(isHttpException(new Error('x'))).toBe(false)
    expect(isHttpException(null)).toBe(false)
    expect(isHttpException({ errorBody: { detail: 'x' } })).toBe(false)
  })

  it('isHttpValidationError — only true when detail is array', () => {
    const stringDetail = new BadRequestError('x', {
      errorBody: { detail: 'string detail' },
    })
    expect(isHttpValidationError(stringDetail)).toBe(false)
    expect(isHttpException(stringDetail)).toBe(true)

    const arrayDetail = new ValidationError('x', {
      errorBody: { detail: [{ loc: ['x'], msg: 'y', type: 'z' }] },
    })
    expect(isHttpValidationError(arrayDetail)).toBe(true)
    expect(isHttpException(arrayDetail)).toBe(false)
  })

  it('isUnparseableErrorBody — true only for raw_body shape', () => {
    const unparseable = new ServerError('x', {
      errorBody: { detail: 'fallback', raw_body: 'invalid' },
    })
    expect(isUnparseableErrorBody(unparseable)).toBe(true)
    expect(isHttpException(unparseable)).toBe(false)

    const httpErr = new BadRequestError('x', { errorBody: { detail: 'real' } })
    expect(isUnparseableErrorBody(httpErr)).toBe(false)
  })

  it('all status-class guards', () => {
    expect(isPermissionError(new PermissionError('x'))).toBe(true)
    expect(isPermissionError(new NotFoundError('x'))).toBe(false)

    expect(isConflictError(new ConflictError('x'))).toBe(true)
    expect(isConflictError(new ValidationError('x'))).toBe(false)

    expect(isValidationError(new ValidationError('x'))).toBe(true)
    expect(isValidationError(new BadRequestError('x'))).toBe(false)

    expect(isServerError(new ServerError('x'))).toBe(true)
    expect(isServerError(new BadRequestError('x'))).toBe(false)

    expect(isNetworkError(new NetworkError('x'))).toBe(true)
    expect(isNetworkError(new BadRequestError('x'))).toBe(false)
  })
})
