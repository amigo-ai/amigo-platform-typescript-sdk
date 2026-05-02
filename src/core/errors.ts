/**
 * Error hierarchy for the Amigo Platform SDK.
 * All errors extend AmigoError which can be caught with a single catch.
 */

import type { components } from '../generated/api.js'

export interface ErrorContext {
  statusCode?: number
  errorCode?: string
  requestId?: string
  detail?: string
  context?: Record<string, unknown>
  /** Parsed error body (typed when recognized) */
  errorBody?: PlatformErrorBody
  /** Raw body string for diagnostic logging — populated even on parse failure */
  rawBody?: string
}

// --- Typed error body shapes ---

/**
 * FastAPI 422 validation-error body.
 * Surfaces from openapi-typescript so consumers can read field-level errors.
 */
export type HttpValidationErrorBody = components['schemas']['HTTPValidationError']

/**
 * Default FastAPI HTTPException shape (`raise HTTPException(status_code, detail=...)`).
 *
 * Most platform-api routes that don't define an explicit error model return
 * this shape. `detail` may be a free-form string or a JSON-serializable object.
 */
export interface HttpExceptionBody {
  detail: string | Record<string, unknown> | unknown[]
  /** Populated by request-id middleware on bounded routes */
  request_id?: string
  /** Populated by typed error responses (e.g. Surface lifecycle errors) */
  error_code?: string
}

/**
 * Fallback shape used when the response body fails to parse or is empty.
 * `rawBody` is the verbatim text (truncated to 8 KB to avoid log bloat).
 */
export interface UnparseableErrorBody {
  detail: string
  raw_body: string
}

/**
 * Discriminated union of all error body shapes the platform API emits.
 *
 * Consumers should use the type guards (`isHttpException`,
 * `isHttpValidationError`, `isUnparseableErrorBody`) rather than checking
 * fields directly — both `HttpExceptionBody` and `HttpValidationErrorBody`
 * have a `detail` field but it is shaped differently.
 */
export type PlatformErrorBody = HttpExceptionBody | HttpValidationErrorBody | UnparseableErrorBody

const RAW_BODY_LIMIT = 8 * 1024 // 8 KB

const SENSITIVE_FIELDS = new Set([
  'id_token',
  'access_token',
  'refresh_token',
  'authorization',
  'api_key',
  'apikey',
  'token',
  'secret',
  'password',
  'x-api-key',
  'cookie',
  'set-cookie',
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
export class AmigoError<TBody extends PlatformErrorBody = PlatformErrorBody> extends Error {
  readonly statusCode?: number
  readonly errorCode?: string
  readonly requestId?: string
  readonly detail?: string
  readonly context?: Record<string, unknown>
  /**
   * Typed body of the error response, when one was returned and successfully
   * parsed. Use the `isHttpException` / `isHttpValidationError` /
   * `isUnparseableErrorBody` type guards to narrow the discriminated union.
   *
   * Named `errorBody` (not `body`) to avoid colliding with the legacy
   * `ParseError.body: string` field.
   */
  readonly errorBody?: TBody
  /**
   * Raw response body (truncated to 8 KB). Populated even when parsing fails,
   * so callers always have something to log when debugging server errors.
   */
  readonly rawBody?: string

  constructor(message: string, ctx: ErrorContext = {}) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = ctx.statusCode
    this.errorCode = ctx.errorCode
    this.requestId = ctx.requestId
    this.detail = ctx.detail
    this.context = ctx.context
      ? (sanitizeErrorContext(ctx.context) as Record<string, unknown>)
      : undefined
    this.errorBody = ctx.errorBody as TBody | undefined
    this.rawBody = ctx.rawBody
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

/** Request timed out before receiving a response */
export class RequestTimeoutError extends NetworkError {
  readonly timeoutMs?: number

  constructor(message: string, timeoutMs?: number, cause?: unknown) {
    super(message, cause)
    this.timeoutMs = timeoutMs
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

/**
 * Internal: legacy flat-shape probe of the parsed JSON body. Used to surface
 * `error_code` / `request_id` / `message` fields that older platform-api
 * routes return alongside the canonical `detail` field.
 */
interface LegacyFlatBody {
  message?: unknown
  detail?: unknown
  error_code?: unknown
  request_id?: unknown
}

/**
 * Best-effort body reader. Always returns *something* — never throws.
 *
 * - On successful JSON parse: returns the typed body (HttpException or
 *   HTTPValidationError shape) plus the raw text for logging.
 * - On parse failure or empty body: returns an UnparseableErrorBody with
 *   `detail` set to `response.statusText` and the raw text preserved.
 * - On network read failure (connection drop mid-read): returns an
 *   UnparseableErrorBody with empty `raw_body`.
 */
async function readErrorBody(response: Response): Promise<{
  body: PlatformErrorBody
  rawBody: string
}> {
  let rawBody = ''
  try {
    rawBody = await response.text()
  } catch {
    // Connection dropped mid-read or body already consumed — fall through.
    return {
      body: { detail: response.statusText || `HTTP ${response.status}`, raw_body: '' },
      rawBody: '',
    }
  }

  const truncatedRaw = rawBody.length > RAW_BODY_LIMIT ? rawBody.slice(0, RAW_BODY_LIMIT) : rawBody

  if (rawBody.length === 0) {
    return {
      body: { detail: response.statusText || `HTTP ${response.status}`, raw_body: '' },
      rawBody: '',
    }
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Recognized shapes: HTTPValidationError (detail is array) or HttpException.
      return { body: parsed as PlatformErrorBody, rawBody: truncatedRaw }
    }
    // JSON parsed but isn't an object (e.g. null, string literal) — surface as
    // unparseable so consumers don't have to guard against weird shapes.
    return {
      body: {
        detail: response.statusText || `HTTP ${response.status}`,
        raw_body: truncatedRaw,
      },
      rawBody: truncatedRaw,
    }
  } catch {
    return {
      body: {
        detail: response.statusText || `HTTP ${response.status}`,
        raw_body: truncatedRaw,
      },
      rawBody: truncatedRaw,
    }
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export async function createApiError(response: Response): Promise<AmigoError> {
  const { body, rawBody } = await readErrorBody(response)
  const flat = body as LegacyFlatBody

  const detailString =
    typeof flat.detail === 'string'
      ? flat.detail
      : flat.detail !== undefined
        ? safeStringify(flat.detail)
        : undefined

  const errorCode = typeof flat.error_code === 'string' ? flat.error_code : undefined
  const requestIdFromBody = typeof flat.request_id === 'string' ? flat.request_id : undefined
  const messageFromBody = typeof flat.message === 'string' ? flat.message : undefined

  const ctx: ErrorContext = {
    statusCode: response.status,
    errorCode,
    requestId: requestIdFromBody ?? response.headers.get('x-request-id') ?? undefined,
    detail: detailString,
    context: { url: response.url, response: body },
    errorBody: body,
    rawBody,
  }
  const message =
    messageFromBody ?? detailString ?? response.statusText ?? `HTTP ${response.status}`

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

export function isRequestTimeoutError(err: unknown): err is RequestTimeoutError {
  return err instanceof RequestTimeoutError
}

export function isPermissionError(err: unknown): err is PermissionError {
  return err instanceof PermissionError
}

export function isConflictError(err: unknown): err is ConflictError {
  return err instanceof ConflictError
}

export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError
}

export function isServerError(err: unknown): err is ServerError {
  return err instanceof ServerError
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError
}

// --- Body type guards ---

/**
 * Narrowed AmigoError where `errorBody` is guaranteed non-undefined.
 * Used as the return-type for body type guards so consumers don't need to
 * re-assert `errorBody !== undefined` after the guard.
 */
export type AmigoErrorWithBody<TBody extends PlatformErrorBody> = AmigoError<TBody> & {
  readonly errorBody: TBody
}

/**
 * True when `err.errorBody` is the FastAPI 422 validation-error shape (an
 * object with `detail: ValidationError[]`). Lets consumers iterate
 * field-level errors without `as any`:
 *
 * ```ts
 * if (isHttpValidationError(err)) {
 *   for (const issue of err.errorBody.detail ?? []) {
 *     console.log(issue.loc, issue.msg)
 *   }
 * }
 * ```
 */
export function isHttpValidationError(
  err: unknown,
): err is AmigoErrorWithBody<HttpValidationErrorBody> {
  if (!(err instanceof AmigoError)) return false
  const body = err.errorBody as { detail?: unknown } | undefined
  return Array.isArray(body?.detail)
}

/**
 * True when `err.errorBody` is the default FastAPI HTTPException shape
 * (`{ detail: string | object | array }`, possibly with `error_code` /
 * `request_id`). This is the most common error body across platform-api.
 */
export function isHttpException(err: unknown): err is AmigoErrorWithBody<HttpExceptionBody> {
  if (!(err instanceof AmigoError)) return false
  const body = err.errorBody
  if (!body) return false
  if (Array.isArray((body as { detail?: unknown }).detail)) {
    // HTTPValidationError, not a plain HTTPException
    return false
  }
  // Has detail (string/object) and no `raw_body` discriminator from the unparseable fallback
  return 'detail' in body && !('raw_body' in body)
}

/**
 * True when the response body could not be parsed as JSON (or was empty).
 * `err.errorBody.raw_body` is the verbatim text (truncated to 8 KB).
 */
export function isUnparseableErrorBody(
  err: unknown,
): err is AmigoErrorWithBody<UnparseableErrorBody> {
  if (!(err instanceof AmigoError)) return false
  const body = err.errorBody as { raw_body?: unknown } | undefined
  return typeof body?.raw_body === 'string'
}
