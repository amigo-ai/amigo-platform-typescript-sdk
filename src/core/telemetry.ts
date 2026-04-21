/**
 * Latency telemetry for the Amigo Platform SDK.
 *
 * Every HTTP call emits a {@link LatencyEvent} with timing broken into:
 *   - `serverMs`  — how long Amigo's backend spent (from `Server-Timing` / `X-Amigo-Server-Time-Ms`)
 *   - `networkMs` — wall-clock minus server time (network + TLS + SDK overhead)
 *   - `totalMs`   — total SDK time for the call
 *
 * This lets integrators attribute latency: anything beyond `totalMs` in their
 * own measurement is their code; `serverMs` is Amigo; the remainder is transit.
 *
 * Telemetry is a thin layer over the existing {@link ClientHooks} system —
 * it installs its own hook that measures time using the per-request `id`.
 */

import type { ClientHooks } from './openapi-client.js'
import { extractRequestId } from './utils.js'

/** Telemetry event fired once per completed HTTP request (success or failure). */
export interface LatencyEvent {
  /** HTTP method, uppercase. */
  method: string
  /** Full request URL. */
  url: string
  /** Path portion of the URL (stable key for aggregation). */
  path: string
  /** HTTP status code, or 0 if the request failed before receiving a response. */
  status: number
  /** Total SDK wall-clock time in milliseconds (onRequest → onResponse/onError). */
  totalMs: number
  /**
   * Server-reported processing time in milliseconds, parsed from
   * `X-Amigo-Server-Time-Ms` or the W3C `Server-Timing` header.
   * `null` if the server did not report it.
   */
  serverMs: number | null
  /**
   * `totalMs - serverMs` when `serverMs` is known; otherwise `null`.
   * Represents network + TLS + any SDK overhead outside the server.
   */
  networkMs: number | null
  /** Server-assigned request ID (from `X-Request-Id`), if present. */
  requestId: string | null
  /** Per-request correlation id assigned by the SDK (propagated from the hook context). */
  clientRequestId: string
  /** `Date.now()` at the moment the request was issued. */
  startedAt: number
  /** Set when the request failed before a response was received. */
  error?: { name: string; message: string }
}

/** Configuration for SDK latency telemetry. */
export interface TelemetryOptions {
  /**
   * Called once per completed HTTP request with a {@link LatencyEvent}.
   * Listener errors are caught and logged, never propagated to the caller.
   */
  onRequest?: (event: LatencyEvent) => void
}

/** Internal mutable state — {@link AmigoClient.onLatency} mutates `listeners`. */
export interface TelemetryState {
  listeners: Set<(event: LatencyEvent) => void>
  /** Per-request-id start timestamps (via performance.now() when available). */
  starts: Map<string, { startedAt: number; perfStart: number }>
}

export function createTelemetryState(opts?: TelemetryOptions): TelemetryState {
  const listeners = new Set<(event: LatencyEvent) => void>()
  if (opts?.onRequest) listeners.add(opts.onRequest)
  return { listeners, starts: new Map() }
}

function emit(state: TelemetryState, event: LatencyEvent): void {
  for (const listener of state.listeners) {
    try {
      listener(event)
    } catch (err) {
      console.error('[amigo-sdk] telemetry listener threw:', err)
    }
  }
}

/** Parse Amigo server-side processing time from response headers. */
export function parseServerTimeMs(headers: Headers): number | null {
  const explicit = headers.get('x-amigo-server-time-ms') ?? headers.get('x-server-time-ms')
  if (explicit) {
    const n = Number(explicit)
    if (Number.isFinite(n) && n >= 0) return n
  }

  // W3C Server-Timing: `amigo;dur=42.3, db;dur=10.1` or `total;dur=42.3, ...`
  const serverTiming = headers.get('server-timing')
  if (!serverTiming) return null

  const entries = serverTiming.split(',').map((s) => s.trim())
  const preferredNames = ['amigo', 'total', 'app']
  for (const name of preferredNames) {
    for (const entry of entries) {
      const dur = extractDur(entry, name)
      if (dur !== null) return dur
    }
  }
  for (const entry of entries) {
    const dur = extractDur(entry)
    if (dur !== null) return dur
  }
  return null
}

function extractDur(entry: string, requiredName?: string): number | null {
  const parts = entry.split(';').map((s) => s.trim())
  const name = parts[0]?.toLowerCase()
  if (!name) return null
  if (requiredName && name !== requiredName) return null
  for (const part of parts.slice(1)) {
    const match = /^dur\s*=\s*([0-9.]+)$/i.exec(part)
    if (match && match[1]) {
      const n = Number(match[1])
      if (Number.isFinite(n) && n >= 0) return n
    }
  }
  return null
}

function now(): number {
  const g = globalThis as { performance?: { now?: () => number } }
  return g.performance?.now?.() ?? Date.now()
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/**
 * Build a {@link ClientHooks} implementation that records latency events into
 * the given state. Designed to be composed with user-supplied hooks —
 * {@link composeHooks} handles that composition.
 */
export function createTelemetryHooks(state: TelemetryState): ClientHooks {
  return {
    onRequest({ id }) {
      state.starts.set(id, { startedAt: Date.now(), perfStart: now() })
    },
    onResponse({ id, request, response }) {
      const start = state.starts.get(id)
      state.starts.delete(id)
      if (!start) return
      const totalMs = now() - start.perfStart
      const serverMs = parseServerTimeMs(response.headers)
      emit(state, {
        method: request.method.toUpperCase(),
        url: request.url,
        path: pathOf(request.url),
        status: response.status,
        totalMs,
        serverMs,
        networkMs: serverMs !== null ? Math.max(0, totalMs - serverMs) : null,
        requestId: extractRequestId(response),
        clientRequestId: id,
        startedAt: start.startedAt,
      })
    },
    onError({ id, request, error }) {
      const start = state.starts.get(id)
      state.starts.delete(id)
      if (!start) return
      const totalMs = now() - start.perfStart
      const name = error instanceof Error ? error.name : 'Error'
      const message = error instanceof Error ? error.message : String(error)
      emit(state, {
        method: request.method.toUpperCase(),
        url: request.url,
        path: pathOf(request.url),
        status: 0,
        totalMs,
        serverMs: null,
        networkMs: null,
        requestId: null,
        clientRequestId: id,
        startedAt: start.startedAt,
        error: { name, message },
      })
    },
  }
}

/** Compose two sets of client hooks so both fire for each lifecycle event. */
export function composeHooks(
  a: ClientHooks | undefined,
  b: ClientHooks | undefined,
): ClientHooks | undefined {
  if (!a) return b
  if (!b) return a
  return {
    async onRequest(ctx) {
      await a.onRequest?.(ctx)
      await b.onRequest?.(ctx)
    },
    async onResponse(ctx) {
      await a.onResponse?.(ctx)
      await b.onResponse?.(ctx)
    },
    async onError(ctx) {
      await a.onError?.(ctx)
      await b.onError?.(ctx)
    },
  }
}
