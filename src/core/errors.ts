/**
 * Error hierarchy for the Amigo Platform SDK.
 * All errors extend AmigoError which can be caught with a single catch.
 */

export interface ErrorContext {
  statusCode?: number
  errorCode?: string
  requestId?: string
  detail?: string
  context?: Record<string, unknown>
}

const SENSITIVE_FIELDS = new Set([
  'id_token', 'access_token', 'refresh_token', 'authorization',
  'api_key', 'apikey', 'token', 'secret', 'password', 'x-api-key',
  'cookie', 'set-cookie',
])

function sanitizeErrorContext(obj: unknown): unknown {
  if (typeof obj !== 'object' || !obj) return obj
  if (Array.isArray(obj)) return obj.map(sanitizeErrorContext)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeErrorContext(value)
    } else {
      result[key] = value
    }
  }
  return result
}

/** Base class for all Amigo Platform SDK errors */
export class AmigoError extends Error {
  readonly statusCode?: number
  readonly errorCode?: string
  readonly requestId?: string
  readonly detail?: string
  readonly context?: Record<string, unknown>

  constructor(message: string, ctx: ErrorContext = {}) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = ctx.statusCode
    this.errorCode = ctx.errorCode
    this.requestId = ctx.requestId
    this.detail = ctx.detail
    this.context = ctx.context ? (sanitizeErrorContext(ctx.context) as Record<string, unknown>) : undefined
    Object.setPrototypeOf(this, new.target.prototype)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      requestId: this.requestId,
      detail: this.detail,
      context: this.context,
      stack: this.stack,
    }
  }
}

/** 400 Bad Request */
export class BadRequestError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 400 })
  }
}

/** 401 Unauthorized — invalid or missing API key */
export class AuthenticationError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 401 })
  }
}

/** 403 Forbidden — insufficient permissions */
export class PermissionError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 403 })
  }
}

/** 404 Not Found */
export class NotFoundError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 404 })
  }
}

/** 409 Conflict — duplicate slug or resource version conflict */
export class ConflictError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 409 })
  }
}

/** 422 Unprocessable Entity — validation failure */
export class ValidationError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 422 })
  }
}

/** 429 Too Many Requests */
export class RateLimitError extends AmigoError {
  readonly retryAfter?: number

  constructor(message: string, ctx: ErrorContext & { retryAfter?: number } = {}) {
    super(message, { ...ctx, statusCode: 429 })
    this.retryAfter = ctx.retryAfter
  }
}

/** 5xx Server Error */
export class ServerError extends AmigoError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: ctx.statusCode ?? 500 })
  }
}

/** 503 Service Unavailable */
export class ServiceUnavailableError extends ServerError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, { ...ctx, statusCode: 503 })
  }
}

/** Network or fetch failure (no HTTP status available) */
export class NetworkError extends AmigoError {
  constructor(message: string, cause?: unknown) {
    super(message)
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: cause, writable: false, enumerable: true })
    }
  }
}

/** Failed to parse response body */
export class ParseError extends AmigoError {
  readonly body?: string

  constructor(message: string, body?: string) {
    super(message)
    this.body = body
  }
}

/** SDK misconfiguration */
export class ConfigurationError extends AmigoError {
  constructor(message: string) {
    super(message)
  }
}

// --- Factory ---

interface ApiErrorBody {
  message?: string
  detail?: string
  error_code?: string
  request_id?: string
}

export async function createApiError(response: Response): Promise<AmigoError> {
  let body: ApiErrorBody = {}
  try {
    const rawBody = await response.text()
    body = JSON.parse(rawBody) as ApiErrorBody
  } catch {
    // ignore parse failure
  }

  const ctx: ErrorContext = {
    statusCode: response.status,
    errorCode: body.error_code,
    requestId: body.request_id ?? response.headers.get('x-request-id') ?? undefined,
    detail: body.detail,
    context: { url: response.url, response: body },
  }
  const message = body.message ?? body.detail ?? response.statusText ?? `HTTP ${response.status}`

  switch (response.status) {
    case 400:
      return new BadRequestError(message, ctx)
    case 401:
      return new AuthenticationError(message, ctx)
    case 403:
      return new PermissionError(message, ctx)
    case 404:
      return new NotFoundError(message, ctx)
    case 409:
      return new ConflictError(message, ctx)
    case 422:
      return new ValidationError(message, ctx)
    case 429: {
      const retryAfter = parseRetryAfter(response)
      return new RateLimitError(message, { ...ctx, retryAfter })
    }
    case 503:
      return new ServiceUnavailableError(message, ctx)
    default:
      return new ServerError(message, ctx)
  }
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get('Retry-After')
  if (!header) return undefined
  const seconds = Number(header)
  if (!isNaN(seconds)) return seconds
  const date = new Date(header)
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000))
  }
  return undefined
}

// --- Type guards ---

export function isAmigoError(err: unknown): err is AmigoError {
  return err instanceof AmigoError
}

export function isNotFoundError(err: unknown): err is NotFoundError {
  return err instanceof NotFoundError
}

export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError
}

export function isAuthenticationError(err: unknown): err is AuthenticationError {
  return err instanceof AuthenticationError
}
