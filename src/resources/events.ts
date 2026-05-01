/**
 * Real-time workspace event streaming via Server-Sent Events.
 *
 * Subscribes to ``GET /v1/{workspace_id}/events/stream`` and yields typed
 * {@link WorkspaceSSEEvent} values. The platform-api endpoint:
 *
 *   - Streams ``text/event-stream`` over HTTP/1.1
 *   - Sends ``retry: 3000`` directive as the first frame
 *   - Tags every event with ``id: <millisecond-timestamp>`` for replay
 *   - Buffers the last 5 minutes of events in Valkey for gapless reconnect
 *   - Pops the discriminator (``event_type``) out of the JSON ``data:``
 *     payload and into the SSE ``event:`` line — this helper reattaches
 *     it before yielding the typed union member
 *
 * Implementation choice: this helper uses the SDK's own fetch transport
 * (with auth + retry middleware applied) rather than the WHATWG
 * ``EventSource`` API or the ``eventsource`` polyfill. The reasons are:
 *
 *   1. ``EventSource`` cannot send ``Authorization`` headers — the polyfill
 *      can, but adds a runtime dep and bypasses the SDK's BFF-proxy /
 *      custom-fetch / mock-fetch composition.
 *   2. Reusing the existing ``createTurnStream`` pattern keeps a single
 *      SSE parser in the SDK and shares the auth middleware that already
 *      attaches the bearer token on every request.
 *   3. The SDK ships with two runtime deps (``openapi-fetch`` +
 *      ``openapi-typescript-helpers``); adding ``eventsource`` would inflate
 *      bundle size for a feature that fetch streaming handles cleanly.
 *
 * The trade-off is that we reimplement the reconnect loop. The platform-api
 * advertises ``retry: 3000`` and we honor that as the initial backoff,
 * doubling with full jitter on each successive failure up to ``maxDelayMs``.
 *
 * @see ConversationsResource.streamTurn for the analogous turn-stream helper.
 */

import type { components } from '../generated/api.js'
import { type PlatformFetch } from '../core/openapi-client.js'
import { WorkspaceScopedResource } from './base.js'

/**
 * Discriminated union of every workspace SSE event variant exposed by
 * platform-api. Members carry their own ``event_type`` literal — narrow
 * with ``switch (event.event_type)`` to access typed payload fields.
 */
export type WorkspaceSSEEvent = components['schemas']['WorkspaceSSEEvent']

/** Discriminator literal for {@link WorkspaceSSEEvent} members. */
export type WorkspaceSSEEventType = WorkspaceSSEEvent['event_type']

/**
 * Options for {@link EventsResource.subscribeToWorkspace}.
 */
export interface SubscribeToWorkspaceOptions {
  /**
   * Resume from a previously seen event id. Forwarded as the
   * ``Last-Event-ID`` request header on the first connect; the server
   * replays buffered events with id > ``lastEventId`` before switching to
   * live pub/sub. The SDK automatically tracks the most recent id during
   * the stream and re-sends it on every reconnect.
   *
   * Event ids are millisecond Unix timestamps; pass them as raw numeric
   * strings.
   */
  lastEventId?: string

  /**
   * Cancellation signal. Aborting the signal closes the underlying fetch
   * stream and stops the reconnect loop.
   */
  signal?: AbortSignal

  /** Invoked once per parsed, typed event. */
  onEvent: (event: WorkspaceSSEEvent) => void

  /**
   * Invoked on a terminal error (e.g., 401 / 403, abort, or reconnect
   * budget exhausted). Will not be called more than once per
   * ``subscribeToWorkspace`` invocation.
   */
  onError?: (error: Error) => void

  /**
   * Invoked just before each reconnect attempt with the 1-based attempt
   * number. The first connection (attempt 0) does not fire this.
   */
  onReconnect?: (attempt: number) => void

  /**
   * Initial reconnect delay in milliseconds. Defaults to 3000 to match
   * the platform-api ``retry:`` directive. The actual delay grows
   * exponentially (with jitter) up to ``maxDelayMs`` per failure.
   */
  initialDelayMs?: number

  /** Cap on the reconnect backoff delay in milliseconds. Defaults to 30s. */
  maxDelayMs?: number

  /**
   * Maximum number of reconnect attempts before giving up and calling
   * ``onError``. Defaults to 10. Set to ``Infinity`` to retry forever
   * (the consumer is then responsible for aborting via ``signal``).
   */
  maxReconnects?: number
}

/**
 * Handle returned by {@link EventsResource.subscribeToWorkspace}.
 *
 * Resolves when the stream terminates — either because the consumer
 * aborted via ``signal``, an unrecoverable error fired ``onError``, or
 * the reconnect budget was exhausted. The promise never rejects; consume
 * errors via ``onError``.
 */
export interface SubscriptionHandle {
  /**
   * Returns a promise that resolves once the subscription has fully
   * stopped (post-abort cleanup complete, no further callbacks pending).
   */
  done: Promise<void>

  /**
   * Stop the subscription. Equivalent to aborting the caller-supplied
   * ``AbortSignal``. Idempotent.
   */
  unsubscribe(): void
}

const DEFAULT_INITIAL_DELAY_MS = 3000
const DEFAULT_MAX_DELAY_MS = 30000
const DEFAULT_MAX_RECONNECTS = 10
// Hard ceiling on a single SSE field value to defend against a misbehaving
// upstream that streams without ever emitting a frame terminator. 1 MiB is
// far above any legitimate platform event payload (most are <2 KiB).
const MAX_FRAME_BYTES = 1_048_576

/**
 * Real-time event stream resource.
 *
 * @example
 * ```ts
 * const handle = client.events.subscribeToWorkspace({
 *   onEvent: (event) => {
 *     switch (event.event_type) {
 *       case 'call.started':
 *         console.log('Call started:', event.call_sid)
 *         break
 *       case 'pipeline.error':
 *         console.error('Pipeline error:', event)
 *         break
 *     }
 *   },
 *   onError: (err) => console.error('Stream error:', err),
 *   onReconnect: (attempt) => console.warn(`Reconnect #${attempt}`),
 * })
 *
 * // Later, to stop:
 * handle.unsubscribe()
 * await handle.done
 * ```
 */
export class EventsResource extends WorkspaceScopedResource {
  constructor(client: PlatformFetch, workspaceId: string) {
    super(client, workspaceId)
  }

  /**
   * Subscribe to the workspace event stream.
   *
   * Establishes an SSE connection to ``/v1/{workspace_id}/events/stream``
   * and invokes ``onEvent`` once per typed {@link WorkspaceSSEEvent}.
   * Unrecoverable failures (auth errors, exhausted reconnect budget,
   * caller abort) surface through ``onError``.
   *
   * Reconnection is automatic: on a network drop or 5xx, the helper
   * backs off (initial delay derived from the ``retry:`` directive,
   * default 3s, doubling with full jitter up to ``maxDelayMs``) and
   * resumes with the most recently seen ``Last-Event-ID``. The platform
   * buffers 5 minutes of events for gapless replay.
   *
   * @returns a {@link SubscriptionHandle} for cleanup. Aborting the
   *   caller's ``signal`` is equivalent to calling ``unsubscribe()``.
   */
  subscribeToWorkspace(options: SubscribeToWorkspaceOptions): SubscriptionHandle {
    const localController = new AbortController()
    const cleanups: Array<() => void> = []

    if (options.signal) {
      if (options.signal.aborted) {
        localController.abort(options.signal.reason)
      } else {
        const onAbort = (): void => localController.abort(options.signal?.reason)
        options.signal.addEventListener('abort', onAbort, { once: true })
        cleanups.push(() => options.signal?.removeEventListener('abort', onAbort))
      }
    }

    const done = runSubscription(
      this.client,
      this.workspaceId,
      options,
      localController.signal,
    ).finally(() => {
      for (const cleanup of cleanups) cleanup()
    })

    return {
      done,
      unsubscribe: () => localController.abort(),
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type StreamOutcome =
  | { kind: 'aborted' }
  | { kind: 'auth-error'; error: Error }
  | { kind: 'transport-error'; reason: string }

async function runSubscription(
  client: PlatformFetch,
  workspaceId: string,
  options: SubscribeToWorkspaceOptions,
  signal: AbortSignal,
): Promise<void> {
  let lastEventId = options.lastEventId
  let attempt = 0
  let delayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const maxReconnects = options.maxReconnects ?? DEFAULT_MAX_RECONNECTS
  let errorReported = false

  const reportError = (error: Error): void => {
    if (errorReported) return
    errorReported = true
    try {
      options.onError?.(error)
    } catch {
      // Consumer-supplied callback raised — swallow to keep teardown clean.
    }
  }

  while (!signal.aborted) {
    if (attempt > 0) {
      try {
        options.onReconnect?.(attempt)
      } catch {
        // Consumer-supplied callback raised — swallow to keep teardown clean.
      }
    }

    let outcome: StreamOutcome
    try {
      outcome = await runOneConnection({
        client,
        workspaceId,
        lastEventId,
        signal,
        onEvent: options.onEvent,
        onIdAdvance: (id) => {
          lastEventId = id
        },
        onRetryDirective: (ms) => {
          // Server-sent retry directive resets the backoff floor.
          delayMs = clampDelay(ms, options.initialDelayMs, maxDelayMs)
        },
      })
    } catch (err) {
      // runOneConnection surfaces only terminal auth errors via throw;
      // everything else is a StreamOutcome.
      reportError(err instanceof Error ? err : new Error(String(err)))
      return
    }

    if (signal.aborted || outcome.kind === 'aborted') {
      return
    }

    if (outcome.kind === 'auth-error') {
      // 401 / 403 — never auto-retry. The token is invalid and the
      // stream cannot succeed without operator intervention.
      reportError(outcome.error)
      return
    }

    if (attempt >= maxReconnects) {
      reportError(
        new Error(
          `SSE subscription exhausted reconnect budget (${maxReconnects}): ${outcome.reason}`,
        ),
      )
      return
    }

    attempt += 1
    const sleepMs = jitter(delayMs)
    delayMs = Math.min(delayMs * 2, maxDelayMs)
    const slept = await abortableSleep(sleepMs, signal)
    if (!slept) return
  }
}

interface RunOneConnectionArgs {
  client: PlatformFetch
  workspaceId: string
  lastEventId: string | undefined
  signal: AbortSignal
  onEvent: (event: WorkspaceSSEEvent) => void
  onIdAdvance: (id: string) => void
  onRetryDirective: (ms: number) => void
}

async function runOneConnection(args: RunOneConnectionArgs): Promise<StreamOutcome> {
  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  if (args.lastEventId !== undefined) {
    headers['Last-Event-ID'] = args.lastEventId
  }

  let result: { data?: unknown; error?: unknown; response?: Response }
  try {
    result = await args.client.GET('/v1/{workspace_id}/events/stream', {
      params: { path: { workspace_id: args.workspaceId } },
      headers,
      parseAs: 'stream',
      signal: args.signal,
    })
  } catch (err) {
    if (args.signal.aborted) return { kind: 'aborted' }
    const error = err instanceof Error ? err : new Error(String(err))
    // 4xx (including 401 / 403) are surfaced as thrown AmigoErrors by the
    // SDK error middleware. Distinguish those from transport failures.
    const status = readStatus(error)
    if (status === 401 || status === 403) {
      return { kind: 'auth-error', error }
    }
    return { kind: 'transport-error', reason: error.message }
  }

  if (result.error !== undefined) {
    // openapi-fetch surfaces non-OK responses as `error`. The SDK error
    // middleware should have thrown — fall through defensively.
    return { kind: 'transport-error', reason: `API error: ${safeStringify(result.error)}` }
  }

  const body = result.data
  if (!(body instanceof ReadableStream)) {
    return { kind: 'transport-error', reason: 'Expected ReadableStream body for SSE' }
  }

  try {
    for await (const frame of parseSSEFrames(body, args.signal)) {
      if (args.signal.aborted) return { kind: 'aborted' }
      if (frame.retry !== undefined) {
        args.onRetryDirective(frame.retry)
      }
      if (frame.id !== undefined) {
        args.onIdAdvance(frame.id)
      }
      if (frame.event && frame.data !== undefined) {
        const event = parseWorkspaceFrame(frame.event, frame.data)
        if (event) {
          try {
            args.onEvent(event)
          } catch {
            // Consumer threw during onEvent; do not let it kill the
            // subscription. The stream is still healthy.
          }
        }
      }
    }
  } catch (err) {
    if (args.signal.aborted) return { kind: 'aborted' }
    const reason = err instanceof Error ? err.message : String(err)
    return { kind: 'transport-error', reason }
  }

  if (args.signal.aborted) return { kind: 'aborted' }
  // Reader closed cleanly — server EOF. Treat as recoverable; reconnect
  // with whatever Last-Event-ID we have.
  return { kind: 'transport-error', reason: 'Stream closed by server' }
}

interface SSEFrame {
  event: string
  data: string | undefined
  id: string | undefined
  retry: number | undefined
}

/**
 * Parses an SSE byte stream into structured frames.
 *
 * Forks the parser in {@link ConversationsResource.streamTurn} to also
 * surface ``id:`` and ``retry:`` lines that the workspace event stream
 * relies on for gapless reconnect.
 */
async function* parseSSEFrames(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<SSEFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // When the caller aborts, cancel the reader so any in-flight
  // ``reader.read()`` resolves immediately with ``{done: true}`` (or rejects
  // with ``AbortError``, which we trap in the consumer). Without this, an
  // idle SSE stream keeps the read pending indefinitely after abort.
  let cancelled = false
  const onAbort = (): void => {
    if (cancelled) return
    cancelled = true
    void reader.cancel().catch(() => {
      // Already cancelled or locked elsewhere; safe to ignore.
    })
  }
  let removeAbortHandler: (() => void) | undefined
  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
    removeAbortHandler = () => signal.removeEventListener('abort', onAbort)
  }

  function* drain(text: string): Generator<SSEFrame> {
    buffer += text
    if (buffer.length > MAX_FRAME_BYTES) {
      throw new Error(`SSE frame buffer exceeded ${MAX_FRAME_BYTES} bytes without terminator`)
    }
    while (true) {
      const idx = findFrameTerminator(buffer)
      if (idx === null) break
      const block = buffer.slice(0, idx.terminatorStart)
      buffer = buffer.slice(idx.terminatorEnd)
      const frame = parseSSEBlock(block)
      if (frame) yield frame
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield* drain(decoder.decode(value, { stream: true }))
    }
    yield* drain(decoder.decode())
    if (buffer.trim().length > 0) {
      const frame = parseSSEBlock(buffer)
      if (frame) yield frame
      buffer = ''
    }
  } finally {
    removeAbortHandler?.()
    try {
      reader.releaseLock()
    } catch {
      // releaseLock can throw if the reader is already detached; ignore.
    }
  }
}

function findFrameTerminator(s: string): { terminatorStart: number; terminatorEnd: number } | null {
  const lf = s.indexOf('\n\n')
  const crlf = s.indexOf('\r\n\r\n')
  if (lf < 0 && crlf < 0) return null
  if (lf < 0) return { terminatorStart: crlf, terminatorEnd: crlf + 4 }
  if (crlf < 0) return { terminatorStart: lf, terminatorEnd: lf + 2 }
  return lf < crlf
    ? { terminatorStart: lf, terminatorEnd: lf + 2 }
    : { terminatorStart: crlf, terminatorEnd: crlf + 4 }
}

function parseSSEBlock(block: string): SSEFrame | null {
  let event = ''
  let id: string | undefined
  let retry: number | undefined
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') {
      event = value
    } else if (field === 'data') {
      dataLines.push(value)
    } else if (field === 'id') {
      id = value
    } else if (field === 'retry') {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed) && parsed >= 0) retry = parsed
    }
    // Unknown fields are ignored per the SSE spec.
  }
  // Surface metadata-only frames (id-only or retry-only) so the reconnect
  // loop can observe ``Last-Event-ID`` advances and server-sent retry hints
  // even on heartbeats / replay-position markers.
  if (!event && dataLines.length === 0 && id === undefined && retry === undefined) {
    return null
  }
  return {
    event,
    data: dataLines.length > 0 ? dataLines.join('\n') : undefined,
    id,
    retry,
  }
}

/**
 * Validate and reattach the discriminator to a frame's JSON payload.
 *
 * The platform-api SSE serializer pops ``event_type`` out of the JSON body
 * (it lives in the SSE ``event:`` line). Reattach it so the resulting
 * value is a well-formed {@link WorkspaceSSEEvent} union member.
 *
 * Drift-tolerant: an unparseable payload, non-object payload, or unknown
 * ``event:`` discriminator is silently dropped (returns ``null``), matching
 * the behavior of the analogous turn-stream parser.
 */
function parseWorkspaceFrame(eventName: string, dataJson: string): WorkspaceSSEEvent | null {
  let payload: unknown
  try {
    payload = JSON.parse(dataJson)
  } catch {
    return null
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  // The discriminator is whatever the server's `event:` line says. We trust
  // the platform-api union: anything outside the generated literal type is
  // dropped at the static-type boundary by the consumer's `switch`.
  return {
    ...(payload as Record<string, unknown>),
    event_type: eventName,
  } as WorkspaceSSEEvent
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' ? status : undefined
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function jitter(ms: number): number {
  // Full jitter: pick a random delay in [0, ms]. Avoids reconnect stampedes
  // when many clients reconnect simultaneously after a deploy.
  return Math.floor(Math.random() * Math.max(1, ms))
}

function clampDelay(ms: number, floor: number | undefined, ceiling: number): number {
  const lo = floor ?? DEFAULT_INITIAL_DELAY_MS
  if (!Number.isFinite(ms) || ms <= 0) return lo
  return Math.min(Math.max(ms, lo), ceiling)
}

async function abortableSleep(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
