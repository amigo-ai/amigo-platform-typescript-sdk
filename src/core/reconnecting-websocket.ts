/**
 * Reconnecting WebSocket primitive shared by the SDK's WS-based realtime
 * helpers (text-stream, session-connect, observer).
 *
 * The platform exposes three workspace-scoped WebSocket surfaces with similar
 * lifecycle requirements:
 *
 *   * Resume on transient drops with exponential backoff + full jitter
 *   * Treat 4001 (client error) and 4403 (auth) close codes as terminal
 *   * Treat 4029 (rate limit / cap) as terminal-but-retryable on a slow timer
 *   * Watchdog the connection: if no message arrives within an idle window,
 *     the upstream is dead even if the TCP socket has not closed; force a
 *     reconnect
 *   * Surface every typed message through ``onMessage`` and every state
 *     transition through ``onStateChange``
 *
 * Before this primitive existed, every consumer (developer-console
 * useStreamSession, useCallObserver, agent-engineering scripts) re-implemented
 * the loop with subtle bugs (different idle thresholds, missing retry budget,
 * no terminal-code handling). This module is the single canonical
 * implementation; resource helpers compose it with their own message parsers
 * and protocol details.
 *
 * @see ReconnectingWebSocket
 * @see EventsResource for the analogous SSE-based helper
 */

/** Lifecycle states reported via {@link ReconnectingWebSocketOptions.onStateChange}. */
export type ReconnectingWebSocketState =
  | 'connecting'
  | 'open'
  | 'closing'
  | 'closed'
  | 'reconnecting'
  | 'terminal'

/** Reasons surfaced to {@link ReconnectingWebSocketOptions.onError} on a terminal close. */
export type ReconnectingWebSocketErrorReason =
  | 'auth'
  | 'rate_limited'
  | 'client_error'
  | 'server_error'
  | 'reconnect_budget_exhausted'
  | 'aborted'
  | 'idle_watchdog'
  | 'open_failed'
  | 'unknown'

/** Structured terminal error surfaced to consumers. */
export class ReconnectingWebSocketError extends Error {
  readonly reason: ReconnectingWebSocketErrorReason
  readonly closeCode: number | undefined
  readonly closeReason: string | undefined
  readonly attempts: number

  constructor(
    message: string,
    reason: ReconnectingWebSocketErrorReason,
    closeCode: number | undefined,
    closeReason: string | undefined,
    attempts: number,
  ) {
    super(message)
    this.name = 'ReconnectingWebSocketError'
    this.reason = reason
    this.closeCode = closeCode
    this.closeReason = closeReason
    this.attempts = attempts
  }
}

/**
 * Constructor for the underlying WebSocket. Defaults to the global
 * ``WebSocket`` (browsers, Bun, Deno, Node 22+ via global) if available.
 *
 * Pass an explicit factory in environments without a global (older Node) or
 * for tests that swap in a mock.
 */
export type WebSocketFactory = (url: string, protocols?: string | string[]) => WebSocket

/** Options for {@link ReconnectingWebSocket}. */
export interface ReconnectingWebSocketOptions {
  /** Target ws:// or wss:// URL. */
  url: string

  /**
   * Optional WebSocket subprotocols. The platform's auth scheme passes the
   * bearer token here (``['auth', token]``) so it never appears in the URL.
   */
  protocols?: string | string[]

  /**
   * Initial backoff delay (ms). Doubles with full jitter on each successive
   * failure up to ``maxDelayMs``. Default ``1_000``.
   */
  initialDelayMs?: number

  /** Cap on the reconnect backoff delay (ms). Default ``30_000``. */
  maxDelayMs?: number

  /**
   * Maximum number of reconnect attempts before giving up. Default ``10``.
   * Set to ``Infinity`` to retry forever (rely on AbortSignal for shutdown).
   */
  maxReconnects?: number

  /**
   * Idle watchdog (ms). If no message arrives within this window the
   * connection is considered dead and is force-closed; the reconnect loop
   * then handles the rebuild. Default ``45_000`` (matches the longest
   * platform endpoint heartbeat). Set to ``0`` to disable.
   */
  idleTimeoutMs?: number

  /**
   * Cancellation signal. Aborting the signal closes the underlying socket
   * and stops the reconnect loop. The ``done`` promise resolves once the
   * teardown completes.
   */
  signal?: AbortSignal

  /**
   * Optional WebSocket factory. Defaults to ``globalThis.WebSocket`` if
   * available; throws at first connect attempt otherwise.
   */
  webSocketFactory?: WebSocketFactory

  /**
   * Invoked when the underlying socket transitions states. Mostly useful
   * for surfacing reconnects to the UI (e.g., "Reconnecting…" banner).
   */
  onStateChange?: (state: ReconnectingWebSocketState) => void

  /**
   * Invoked once per inbound frame. ``MessageEvent.data`` is delivered raw
   * — consumers parse JSON / binary themselves.
   */
  onMessage: (event: MessageEvent) => void

  /**
   * Invoked just before each reconnect attempt with the 1-based attempt
   * number, the planned delay (ms), and the close code that triggered the
   * reconnect.
   */
  onReconnect?: (info: { attempt: number; delayMs: number; closeCode: number | undefined }) => void

  /**
   * Invoked exactly once per ``ReconnectingWebSocket`` instance on a
   * terminal failure (consumer-aborted, reconnect budget exhausted, or a
   * close code in the terminal set: 4001 / 4003 / 4403 / 4100 / 1008).
   */
  onError?: (error: ReconnectingWebSocketError) => void
}

/** Handle returned by {@link createReconnectingWebSocket}. */
export interface ReconnectingWebSocketHandle {
  /**
   * Resolves when the loop has fully stopped (post-abort cleanup complete).
   * Never rejects; consume errors via ``onError``.
   */
  done: Promise<void>

  /**
   * Send a frame on the currently open socket. Throws if no socket is
   * currently open. Use ``onStateChange`` to gate sends, or buffer in
   * caller code.
   */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void

  /**
   * Close the connection and stop reconnecting. Equivalent to aborting the
   * caller-supplied signal. Idempotent.
   */
  close(code?: number, reason?: string): void

  /** Latest known lifecycle state. */
  readonly state: ReconnectingWebSocketState
}

/**
 * Close codes that should NEVER be retried. The server is telling us the
 * connection cannot succeed regardless of how many times we try.
 *
 * 1008 (policy violation), 4001 (client error / bad params), 4003
 * (forbidden), 4100 (auth / not authenticated, used by some platform
 * endpoints), 4403 (forbidden — used by platform-api session-connect for
 * auth and origin rejection).
 */
const TERMINAL_CLOSE_CODES = new Set([1008, 4001, 4003, 4100, 4403])

/**
 * Close codes that are terminal-but-rate-limited. The reconnect loop honors
 * a longer floor (``RATE_LIMITED_FLOOR_MS``) before retrying so the client
 * does not amplify the problem it just hit.
 *
 * 4029 (custom platform code for "too many connections / burst exceeded").
 * 1013 (try again later, RFC 6455 standard hint).
 */
const RATE_LIMITED_CLOSE_CODES = new Set([1013, 4029])

const RATE_LIMITED_FLOOR_MS = 5_000

const DEFAULT_INITIAL_DELAY_MS = 1_000
const DEFAULT_MAX_DELAY_MS = 30_000
const DEFAULT_MAX_RECONNECTS = 10
const DEFAULT_IDLE_TIMEOUT_MS = 45_000

/**
 * Build a managed reconnecting WebSocket.
 *
 * The returned handle is the only public surface; the underlying
 * ``WebSocket`` is held privately so consumers cannot bypass the lifecycle
 * machinery (which would defeat the watchdog and reconnect loop).
 *
 * @example
 * ```ts
 * const handle = createReconnectingWebSocket({
 *   url: client.conversations.sessionConnectUrl({ serviceId, entityId }),
 *   protocols: sessionConnectAuthProtocols(apiKey),
 *   onMessage: (e) => console.log('frame', e.data),
 *   onStateChange: (s) => console.log('state', s),
 *   onError: (err) => console.error('terminal:', err.reason, err.closeCode),
 * });
 *
 * handle.send(JSON.stringify({ type: 'user_text', text: 'hi' }));
 * await handle.done;  // resolves after handle.close() or terminal error
 * ```
 */
export function createReconnectingWebSocket(
  options: ReconnectingWebSocketOptions,
): ReconnectingWebSocketHandle {
  const factory = resolveWebSocketFactory(options.webSocketFactory)
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const maxReconnects = options.maxReconnects ?? DEFAULT_MAX_RECONNECTS
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS

  const localController = new AbortController()
  if (options.signal) {
    if (options.signal.aborted) {
      localController.abort(options.signal.reason)
    } else {
      const onAbort = (): void => localController.abort(options.signal?.reason)
      options.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  let currentSocket: WebSocket | null = null
  let state: ReconnectingWebSocketState = 'connecting'
  let errorReported = false

  function setState(next: ReconnectingWebSocketState): void {
    if (state === next) return
    state = next
    try {
      options.onStateChange?.(next)
    } catch {
      // Consumer-thrown error in onStateChange must not kill the loop.
    }
  }

  function reportError(err: ReconnectingWebSocketError): void {
    if (errorReported) return
    errorReported = true
    setState('terminal')
    try {
      options.onError?.(err)
    } catch {
      // Consumer-thrown error must not leak.
    }
  }

  const handle: ReconnectingWebSocketHandle = {
    get state() {
      return state
    },
    get done() {
      return done
    },
    send(data) {
      if (!currentSocket || currentSocket.readyState !== 1 /* OPEN */) {
        throw new Error(`Cannot send on socket in state ${state}`)
      }
      currentSocket.send(data)
    },
    close(code, reason) {
      localController.abort(new Error(reason ?? 'closed'))
      try {
        currentSocket?.close(code, reason)
      } catch {
        // Already closed; ignore.
      }
    },
  }

  const done = runLoop({
    factory,
    options,
    initialDelayMs,
    maxDelayMs,
    maxReconnects,
    idleTimeoutMs,
    signal: localController.signal,
    setState,
    reportError,
    setSocket: (s) => {
      currentSocket = s
    },
  })

  return handle
}

interface RunLoopArgs {
  factory: WebSocketFactory
  options: ReconnectingWebSocketOptions
  initialDelayMs: number
  maxDelayMs: number
  maxReconnects: number
  idleTimeoutMs: number
  signal: AbortSignal
  setState: (s: ReconnectingWebSocketState) => void
  reportError: (e: ReconnectingWebSocketError) => void
  setSocket: (s: WebSocket | null) => void
}

interface ConnectionOutcome {
  closeCode: number | undefined
  closeReason: string | undefined
  /** Set when the watchdog forced a close. */
  watchdogTriggered: boolean
  /** Set when the consumer explicitly aborted. */
  aborted: boolean
}

async function runLoop(args: RunLoopArgs): Promise<void> {
  const { options, signal, setState, reportError, setSocket } = args
  let attempt = 0
  let delayMs = args.initialDelayMs

  while (!signal.aborted) {
    if (attempt > 0) {
      setState('reconnecting')
      const sleepMs = jitter(delayMs)
      try {
        options.onReconnect?.({ attempt, delayMs: sleepMs, closeCode: undefined })
      } catch {
        // ignore
      }
      const slept = await abortableSleep(sleepMs, signal)
      if (!slept) break
      delayMs = Math.min(delayMs * 2, args.maxDelayMs)
    }

    setState(attempt === 0 ? 'connecting' : 'connecting')

    let outcome: ConnectionOutcome
    try {
      outcome = await runOneConnection(args)
    } catch (err) {
      // Synchronous open failure (e.g., factory threw, invalid URL).
      reportError(
        new ReconnectingWebSocketError(
          err instanceof Error ? err.message : 'Failed to open WebSocket',
          'open_failed',
          undefined,
          undefined,
          attempt,
        ),
      )
      return
    } finally {
      setSocket(null)
    }

    // Terminal close codes are reported BEFORE the abort check because the
    // close arrived from the wire — the consumer's subsequent ``close()``
    // call (which flips signal.aborted true) must not suppress the diagnostic.
    if (outcome.closeCode !== undefined && TERMINAL_CLOSE_CODES.has(outcome.closeCode)) {
      reportError(
        new ReconnectingWebSocketError(
          `Server closed with terminal code ${outcome.closeCode}: ${outcome.closeReason ?? ''}`,
          outcome.closeCode === 4403 ? 'auth' : 'client_error',
          outcome.closeCode,
          outcome.closeReason,
          attempt,
        ),
      )
      return
    }

    if (outcome.aborted || signal.aborted) {
      setState('closed')
      return
    }

    if (attempt >= args.maxReconnects) {
      reportError(
        new ReconnectingWebSocketError(
          `Reconnect budget exhausted (${args.maxReconnects} attempts)`,
          'reconnect_budget_exhausted',
          outcome.closeCode,
          outcome.closeReason,
          attempt,
        ),
      )
      return
    }

    if (outcome.closeCode !== undefined && RATE_LIMITED_CLOSE_CODES.has(outcome.closeCode)) {
      // Pin the floor up so we do not hammer the server we just got
      // throttled by. Honor whichever is larger between the current
      // exponential delay and the rate-limited floor.
      delayMs = Math.max(delayMs, RATE_LIMITED_FLOOR_MS)
    }

    attempt += 1
  }

  setState('closed')
}

async function runOneConnection(args: RunLoopArgs): Promise<ConnectionOutcome> {
  const { options, factory, signal, setState, setSocket, idleTimeoutMs } = args

  let socket: WebSocket
  try {
    socket = factory(options.url, options.protocols)
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err))
  }
  setSocket(socket)

  return new Promise<ConnectionOutcome>((resolve) => {
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null
    let resolved = false

    function clearWatchdog(): void {
      if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer)
        watchdogTimer = null
      }
    }

    function armWatchdog(): void {
      if (idleTimeoutMs <= 0) return
      clearWatchdog()
      watchdogTimer = setTimeout(() => {
        if (resolved) return
        try {
          socket.close(4001, 'idle timeout')
        } catch {
          // already closed
        }
        finalize({
          closeCode: 4001,
          closeReason: 'idle timeout',
          watchdogTriggered: true,
          aborted: false,
        })
      }, idleTimeoutMs)
    }

    function finalize(outcome: ConnectionOutcome): void {
      if (resolved) return
      resolved = true
      clearWatchdog()
      signal.removeEventListener('abort', onAbort)
      try {
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('close', onClose as unknown as Parameters<WebSocket['removeEventListener']>[1])
        socket.removeEventListener('error', onSocketError)
      } catch {
        // best effort
      }
      resolve(outcome)
    }

    function onOpen(): void {
      setState('open')
      armWatchdog()
    }

    function onMessage(ev: MessageEvent): void {
      armWatchdog()
      try {
        options.onMessage(ev)
      } catch {
        // Consumer-thrown error in onMessage must not kill the loop;
        // the connection is still healthy.
      }
    }

    // CloseEvent is not in lib: ESNext + @types/node — accept a structural
    // shape with just the fields we read so this works in browser, Bun,
    // Deno, Node ws library, and the WHATWG ws polyfill alike.
    function onClose(ev: { code?: number; reason?: string }): void {
      setState('closed')
      finalize({
        closeCode: ev.code,
        closeReason: ev.reason,
        watchdogTriggered: false,
        aborted: false,
      })
    }

    function onSocketError(): void {
      // The browser/Node WebSocket fires 'error' before 'close' on transport
      // failures. We don't terminate here — the close handler will run with
      // a meaningful close code and we want one resolution path.
    }

    function onAbort(): void {
      try {
        socket.close(1000, 'client aborted')
      } catch {
        // already closed
      }
      finalize({
        closeCode: undefined,
        closeReason: undefined,
        watchdogTriggered: false,
        aborted: true,
      })
    }

    if (signal.aborted) {
      onAbort()
      return
    }

    socket.addEventListener('open', onOpen)
    socket.addEventListener('message', onMessage)
    // ``addEventListener`` accepts a ``CloseEvent``-shaped handler; we cast
    // through ``unknown`` because lib: ESNext + @types/node doesn't expose
    // a global ``CloseEvent`` / ``EventListener`` in every supported runtime.
    socket.addEventListener(
      'close',
      onClose as unknown as Parameters<WebSocket['addEventListener']>[1],
    )
    socket.addEventListener('error', onSocketError)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function resolveWebSocketFactory(
  factory: WebSocketFactory | undefined,
): WebSocketFactory {
  if (factory) return factory
  const globalWs = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket
  if (!globalWs) {
    return () => {
      throw new Error(
        'No global WebSocket available; pass webSocketFactory to createReconnectingWebSocket',
      )
    }
  }
  return (url, protocols) => new globalWs(url, protocols)
}

function jitter(ms: number): number {
  return Math.floor(Math.random() * Math.max(1, ms))
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
