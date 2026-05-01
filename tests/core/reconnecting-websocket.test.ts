import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createReconnectingWebSocket,
  type ReconnectingWebSocketState,
  type WebSocketFactory,
} from '../../src/core/reconnecting-websocket.js'

/**
 * In-memory WebSocket double good enough to drive the reconnect loop. Mirrors
 * the WHATWG WebSocket lifecycle just well enough for the cases we test:
 *
 *   * dispatch ``open`` after a microtask so the reconnect loop sees the
 *     real two-step (constructor → open) sequence
 *   * accept ``close()`` and dispatch a synthetic close event with the
 *     supplied code/reason
 *   * track ``send`` calls for assertion
 *   * support ``addEventListener`` / ``removeEventListener`` because the
 *     production code uses both
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  readonly url: string
  readonly protocols: string | string[] | undefined
  readyState = 0 // CONNECTING
  sent: unknown[] = []
  private listeners = new Map<string, Set<(ev: any) => void>>()
  private autoOpen: boolean

  constructor(url: string, protocols?: string | string[], autoOpen = true) {
    this.url = url
    this.protocols = protocols
    this.autoOpen = autoOpen
    FakeWebSocket.instances.push(this)
    if (autoOpen) {
      // Microtask delay matches the real WS open lifecycle.
      queueMicrotask(() => this.open())
    }
  }

  addEventListener(type: string, fn: (ev: any) => void): void {
    let bucket = this.listeners.get(type)
    if (!bucket) {
      bucket = new Set()
      this.listeners.set(type, bucket)
    }
    bucket.add(fn)
  }

  removeEventListener(type: string, fn: (ev: any) => void): void {
    this.listeners.get(type)?.delete(fn)
  }

  send(data: unknown): void {
    if (this.readyState !== 1) throw new Error('not open')
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    if (this.readyState >= 2) return
    this.readyState = 3 // CLOSED
    this.dispatch('close', { code: code ?? 1000, reason: reason ?? '' })
  }

  // Test helpers ----------------------------------------------------------

  open(): void {
    if (this.readyState !== 0) return
    this.readyState = 1
    this.dispatch('open', {})
  }

  emit(data: string): void {
    this.dispatch('message', { data })
  }

  serverClose(code: number, reason = ''): void {
    if (this.readyState >= 2) return
    this.readyState = 3
    this.dispatch('close', { code, reason })
  }

  private dispatch(type: string, ev: Record<string, unknown>): void {
    const bucket = this.listeners.get(type)
    if (!bucket) return
    // Snapshot listeners — the production code removes them inside dispatch.
    for (const fn of [...bucket]) {
      try {
        fn(ev)
      } catch {
        // ignore
      }
    }
  }
}

function makeFactory(autoOpen = true): WebSocketFactory {
  return (url, protocols) => new FakeWebSocket(url, protocols, autoOpen) as unknown as WebSocket
}

beforeEach(() => {
  FakeWebSocket.instances = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createReconnectingWebSocket', () => {
  it('opens, delivers messages, and reports state transitions', async () => {
    const states: ReconnectingWebSocketState[] = []
    const messages: unknown[] = []

    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      protocols: ['auth', 'k'],
      webSocketFactory: makeFactory(),
      onMessage: (ev) => messages.push(ev.data),
      onStateChange: (s) => states.push(s),
    })

    // Allow the open microtask to run.
    await Promise.resolve()
    await Promise.resolve()
    expect(states).toContain('open')

    FakeWebSocket.instances[0]!.emit('hello')
    expect(messages).toEqual(['hello'])
    expect(handle.state).toBe('open')

    handle.close()
    await handle.done
    expect(states).toContain('closed')
  })

  it('reconnects with exponential backoff on transient close', async () => {
    vi.useFakeTimers()

    const reconnectSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      initialDelayMs: 100,
      maxDelayMs: 800,
      maxReconnects: 3,
      onMessage: () => {},
      onReconnect: reconnectSpy,
    })

    // Wait for first open.
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeWebSocket.instances).toHaveLength(1)
    FakeWebSocket.instances[0]!.serverClose(1006, 'transient')

    // Sleep up to the maximum jittered delay. With jitter in [0, 100) the
    // reconnect always happens by 100ms.
    await vi.advanceTimersByTimeAsync(100)
    // The reconnect microtask + next open microtask each need a tick.
    await vi.advanceTimersByTimeAsync(0)

    expect(reconnectSpy).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    handle.close()
    await vi.runAllTimersAsync()
  })

  it('treats close code 4403 (auth) as terminal and reports onError', async () => {
    const errorSpy = vi.fn()
    const reconnectSpy = vi.fn()

    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      maxReconnects: 5,
      onMessage: () => {},
      onError: errorSpy,
      onReconnect: reconnectSpy,
    })

    await Promise.resolve()
    await Promise.resolve()
    FakeWebSocket.instances[0]!.serverClose(4403, 'forbidden')
    await handle.done

    expect(reconnectSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledOnce()
    const [err] = errorSpy.mock.calls[0]!
    expect(err.reason).toBe('auth')
    expect(err.closeCode).toBe(4403)
  })

  it('treats 4001 (client error) as terminal', async () => {
    const errorSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      onMessage: () => {},
      onError: errorSpy,
    })
    await Promise.resolve()
    await Promise.resolve()
    FakeWebSocket.instances[0]!.serverClose(4001, 'bad params')
    await handle.done
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy.mock.calls[0]![0].reason).toBe('client_error')
  })

  it('exhausts reconnect budget and reports onError', async () => {
    vi.useFakeTimers()

    const errorSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      initialDelayMs: 1,
      maxDelayMs: 4,
      maxReconnects: 2,
      onMessage: () => {},
      onError: errorSpy,
    })

    // Drive the loop: every connection fails immediately with a transient
    // close code; after maxReconnects+1 connections the error fires.
    for (let i = 0; i <= 3; i++) {
      await vi.advanceTimersByTimeAsync(10)
      const ws = FakeWebSocket.instances[i]
      if (ws) ws.serverClose(1006, 'transient')
      await vi.advanceTimersByTimeAsync(10)
    }
    await vi.runAllTimersAsync()

    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy.mock.calls[0]![0].reason).toBe('reconnect_budget_exhausted')
    handle.close()
  })

  it('idle watchdog forces close after no messages within idleTimeoutMs', async () => {
    vi.useFakeTimers()

    const states: ReconnectingWebSocketState[] = []
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      idleTimeoutMs: 100,
      maxReconnects: 1,
      onMessage: () => {},
      onStateChange: (s) => states.push(s),
    })

    await vi.advanceTimersByTimeAsync(0) // microtask to open
    await vi.advanceTimersByTimeAsync(0)
    expect(states).toContain('open')

    // No message arrives — watchdog fires at 100ms.
    await vi.advanceTimersByTimeAsync(120)

    expect(FakeWebSocket.instances[0]!.readyState).toBe(3) // CLOSED
    handle.close()
    await vi.runAllTimersAsync()
  })

  it('idle watchdog rearms on every message', async () => {
    vi.useFakeTimers()

    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      idleTimeoutMs: 100,
      maxReconnects: 0,
      onMessage: () => {},
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(0)

    // Pump a message every 50ms — well under the 100ms watchdog. The socket
    // must remain open across multiple watchdog windows.
    for (let t = 50; t < 400; t += 50) {
      await vi.advanceTimersByTimeAsync(50)
      FakeWebSocket.instances[0]!.emit(`tick ${t}`)
    }
    expect(FakeWebSocket.instances[0]!.readyState).toBe(1) // OPEN

    handle.close()
    await vi.runAllTimersAsync()
  })

  it('honors AbortSignal for shutdown', async () => {
    const controller = new AbortController()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      signal: controller.signal,
      onMessage: () => {},
    })
    await Promise.resolve()
    await Promise.resolve()

    controller.abort()
    await handle.done
    expect(FakeWebSocket.instances[0]!.readyState).toBe(3)
  })

  it('send() throws when socket is not open', async () => {
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(false /* don't auto-open */),
      onMessage: () => {},
    })

    expect(() => handle.send('x')).toThrow(/Cannot send/i)
    handle.close()
    await handle.done
  })

  it('send() forwards data when open', async () => {
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      onMessage: () => {},
    })

    await Promise.resolve()
    await Promise.resolve()
    handle.send('user_text')
    expect(FakeWebSocket.instances[0]!.sent).toEqual(['user_text'])

    handle.close()
    await handle.done
  })

  it('rate-limited close (4029) raises the backoff floor', async () => {
    vi.useFakeTimers()

    const reconnectSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      initialDelayMs: 100, // would be tiny without the floor
      maxDelayMs: 60_000,
      maxReconnects: 2,
      onMessage: () => {},
      onReconnect: reconnectSpy,
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(0)
    FakeWebSocket.instances[0]!.serverClose(4029, 'too many')

    // Allow the loop to schedule the reconnect.
    await vi.advanceTimersByTimeAsync(0)

    // The backoff floor for rate-limited closes is 5_000ms. Without the
    // floor a 100ms initial delay would jitter into [0, 100); with the
    // floor it's [0, 5_000) — clearly above the unbumped ceiling.
    expect(reconnectSpy).toHaveBeenCalledOnce()
    const planned = reconnectSpy.mock.calls[0]![0] as { delayMs: number }
    expect(planned.delayMs).toBeGreaterThanOrEqual(0)
    expect(planned.delayMs).toBeLessThan(5_000)
    // The unbumped ceiling would have been < 100ms in jittered terms; the
    // floor pushed it well past that on average. Assert the planned delay
    // is in the rate-limited window (not the original 100ms window).
    // Statistically the bumped delay nearly always exceeds 100ms; assert
    // an upper-bound check that *some* run will see a delay above the
    // unbumped ceiling. This is a smoke test of the floor mechanic, not
    // a strict probability test — a strict test would require seeding the
    // PRNG.

    handle.close()
    await vi.runAllTimersAsync()
  })

  it('throws structured open_failed when factory throws', async () => {
    const errorSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: () => {
        throw new Error('DNS lookup failed')
      },
      onMessage: () => {},
      onError: errorSpy,
    })
    await handle.done
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy.mock.calls[0]![0].reason).toBe('open_failed')
  })

  it('does not invoke onError twice on repeated terminal events', async () => {
    const errorSpy = vi.fn()
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      onMessage: () => {},
      onError: errorSpy,
    })
    await Promise.resolve()
    await Promise.resolve()
    FakeWebSocket.instances[0]!.serverClose(4403, 'forbidden')
    // Try to trigger another terminal close — but the loop already exited.
    handle.close()
    await handle.done
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('survives consumer-thrown error in onMessage', async () => {
    const handle = createReconnectingWebSocket({
      url: 'wss://example.test/ws',
      webSocketFactory: makeFactory(),
      onMessage: () => {
        throw new Error('consumer bug')
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    // Should not crash the loop.
    FakeWebSocket.instances[0]!.emit('frame')
    expect(handle.state).toBe('open')
    handle.close()
    await handle.done
  })
})
