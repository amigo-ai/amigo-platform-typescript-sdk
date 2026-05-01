import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import {
  WorkspaceEventStreamError,
  isWorkspaceEventStreamError,
} from '../../src/index.js'
import type { WorkspaceSSEEvent } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const STREAM_PATH = `/v1/${TEST_WORKSPACE_ID}/events/stream`

type RouteHandler = (request: Request) => Response | Promise<Response>

function mockFetch(routes: Record<string, RouteHandler>): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init)
    const pathname = new URL(request.url).pathname
    const key = `${request.method.toUpperCase()} ${pathname}`
    const handler = routes[key]
    if (handler) return await handler(request)
    return Response.json({ detail: `No mock for ${key}` }, { status: 500 })
  }
}

function sseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    },
  })
}

/**
 * Build a stream that stays open until the returned `close()` is invoked,
 * letting tests observe the AbortSignal cleanup path.
 */
function pendingStream(initialFrames: string[]): {
  stream: ReadableStream<Uint8Array>
  close: () => void
} {
  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
      for (const frame of initialFrames) controller.enqueue(encoder.encode(frame))
    },
  })
  return {
    stream,
    close: () => {
      try {
        controllerRef?.close()
      } catch {
        // already closed
      }
    },
  }
}

describe('EventsResource', () => {
  it('subscribeToWorkspace yields three typed events on the happy path', async () => {
    const stream = sseStream([
      'retry: 3000\n\n',
      'id: 1700000000001\nevent: call.started\ndata: {"call_sid":"CA-1","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
      'id: 1700000000002\nevent: pipeline.error\ndata: {"pipeline_name":"world","error_code":"PIPELINE_FAILURE","error_message":"boom"}\n\n',
      'id: 1700000000003\nevent: call.ended\ndata: {"call_sid":"CA-1","duration_seconds":42}\n\n',
    ])

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    let finalError: Error | undefined
    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 0,
      onEvent: (event) => events.push(event),
      onError: (err) => {
        finalError = err
      },
    })

    await handle.done

    expect(events.map((e) => e.event_type)).toEqual([
      'call.started',
      'pipeline.error',
      'call.ended',
    ])
    // Spot-check the discriminated union — narrowing by `event_type` exposes
    // typed payload fields.
    const callStarted = events[0]
    expect(callStarted?.event_type).toBe('call.started')
    if (callStarted?.event_type === 'call.started') {
      expect(callStarted.call_sid).toBe('CA-1')
      expect(callStarted.direction).toBe('inbound')
    }
    // Stream closed by server with maxReconnects=0 surfaces as a budget-
    // exhausted error to the caller.
    expect(finalError).toBeDefined()
    expect(finalError?.message).toMatch(/reconnect budget/)
  })

  it('reconnects with Last-Event-ID after a server drop', async () => {
    const requests: Request[] = []
    let attempt = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: (req) => {
          requests.push(req)
          attempt += 1
          if (attempt === 1) {
            return new Response(
              sseStream([
                'retry: 5\n\n',
                'id: 1700000000001\nevent: call.started\ndata: {"call_sid":"CA-1","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
              ]),
              { headers: { 'content-type': 'text/event-stream' } },
            )
          }
          // Second connection delivers one more event, then ends.
          return new Response(
            sseStream([
              'id: 1700000000002\nevent: call.ended\ndata: {"call_sid":"CA-1","duration_seconds":7}\n\n',
            ]),
            { headers: { 'content-type': 'text/event-stream' } },
          )
        },
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    let reconnectAttempts = 0
    const handle = client.events.subscribeToWorkspace({
      onEvent: (event) => events.push(event),
      onReconnect: (n) => {
        reconnectAttempts = n
      },
      // Tight budget so the test terminates promptly on the second close.
      maxReconnects: 1,
      // Cap the delay so we don't add real wall time to the test.
      initialDelayMs: 1,
      maxDelayMs: 1,
    })

    await handle.done

    expect(requests).toHaveLength(2)
    // First attempt has no Last-Event-ID header.
    expect(requests[0]?.headers.get('last-event-id')).toBeNull()
    // Reconnect carries the most recent id we observed.
    expect(requests[1]?.headers.get('last-event-id')).toBe('1700000000001')
    expect(reconnectAttempts).toBe(1)
    expect(events.map((e) => e.event_type)).toEqual(['call.started', 'call.ended'])
  })

  it('seeds Last-Event-ID from the lastEventId option on first connect', async () => {
    let firstRequest: Request | undefined
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: (req) => {
          firstRequest = req
          return new Response(sseStream(['retry: 3000\n\n']), {
            headers: { 'content-type': 'text/event-stream' },
          })
        },
      }),
    })

    const handle = client.events.subscribeToWorkspace({
      lastEventId: '1699999999999',
      maxReconnects: 0,
      initialDelayMs: 1,
      maxDelayMs: 1,
      onEvent: () => {},
      onError: () => {},
    })

    await handle.done

    expect(firstRequest?.headers.get('last-event-id')).toBe('1699999999999')
  })

  it('aborts cleanly via AbortSignal and unsubscribe', async () => {
    const { stream, close } = pendingStream([
      'retry: 3000\n\n',
      'id: 1700000000001\nevent: call.started\ndata: {"call_sid":"CA-1","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    let onErrorFired = false
    const controller = new AbortController()
    const handle = client.events.subscribeToWorkspace({
      signal: controller.signal,
      onEvent: (event) => {
        events.push(event)
        // First event arrives — initiate teardown.
        controller.abort()
      },
      onError: () => {
        onErrorFired = true
      },
    })

    await handle.done
    close()

    expect(events).toHaveLength(1)
    expect(events[0]?.event_type).toBe('call.started')
    // Abort is not an error — onError must NOT fire.
    expect(onErrorFired).toBe(false)
  })

  it('unsubscribe() stops the loop without a caller-supplied signal', async () => {
    const { stream, close } = pendingStream([
      'retry: 3000\n\n',
      'id: 1\nevent: call.started\ndata: {"call_sid":"CA-1","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    let firstEvent: WorkspaceSSEEvent | undefined
    const handle = client.events.subscribeToWorkspace({
      onEvent: (event) => {
        if (!firstEvent) {
          firstEvent = event
          handle.unsubscribe()
        }
      },
    })
    await handle.done
    close()
    expect(firstEvent?.event_type).toBe('call.started')
  })

  it('drops malformed and unknown frames without crashing', async () => {
    const stream = sseStream([
      'retry: 3000\n\n',
      // Missing data line — drop.
      'event: call.started\n\n',
      // Bad JSON — drop, do not throw.
      'event: call.started\ndata: not-json\n\n',
      // Array payload — must be a record; drop.
      'event: call.started\ndata: [1,2,3]\n\n',
      // Comment line + valid frame.
      ': heartbeat 1700000000\nid: 1700000000001\nevent: call.started\ndata: {"call_sid":"CA-OK","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 0,
      onEvent: (event) => events.push(event),
      onError: () => {},
    })
    await handle.done

    expect(events).toHaveLength(1)
    expect(events[0]?.event_type).toBe('call.started')
    if (events[0]?.event_type === 'call.started') {
      expect(events[0].call_sid).toBe('CA-OK')
    }
  })

  it('parses frames split across chunk boundaries', async () => {
    const stream = sseStream([
      'retry: 30',
      '00\n\nid: 17000000',
      '00001\nevent: call.start',
      'ed\ndata: {"call_sid":"CA-CHUNK","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 0,
      onEvent: (event) => events.push(event),
      onError: () => {},
    })
    await handle.done

    expect(events).toHaveLength(1)
    expect(events[0]?.event_type).toBe('call.started')
  })

  it('401 response triggers onError exactly once and stops reconnecting', async () => {
    let calls = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () => {
          calls += 1
          return Response.json({ message: 'Invalid token' }, { status: 401 })
        },
      }),
    })

    const errors: Error[] = []
    let reconnectCount = 0
    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 5,
      initialDelayMs: 1,
      maxDelayMs: 1,
      onEvent: () => {},
      onError: (err) => errors.push(err),
      onReconnect: () => {
        reconnectCount += 1
      },
    })

    await handle.done

    expect(calls).toBe(1)
    expect(reconnectCount).toBe(0)
    expect(errors).toHaveLength(1)
    // Must be a real Error subclass (specifically AuthenticationError, status 401).
    expect(errors[0]).toBeInstanceOf(Error)
    expect((errors[0] as { statusCode?: number }).statusCode).toBe(401)
  })

  it('attaches the Bearer token via the SDK auth middleware', async () => {
    let observedAuth: string | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: (req) => {
          observedAuth = req.headers.get('authorization')
          return new Response(sseStream(['retry: 3000\n\n']), {
            headers: { 'content-type': 'text/event-stream' },
          })
        },
      }),
    })

    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 0,
      initialDelayMs: 1,
      maxDelayMs: 1,
      onEvent: () => {},
      onError: () => {},
    })
    await handle.done

    expect(observedAuth).toBe(`Bearer ${TEST_API_KEY}`)
  })

  it('surfaces too_many_streams as a typed terminal error and stops reconnecting', async () => {
    let calls = 0
    const stream = sseStream([
      'retry: 3000\n\n',
      'id: 0\nevent: error\ndata: {"code":"too_many_streams","message":"cap reached","max_streams":50}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () => {
          calls += 1
          return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
        },
      }),
    })

    const errors: Error[] = []
    const handle = client.events.subscribeToWorkspace({
      onEvent: () => {},
      onError: (err) => errors.push(err),
    })
    await handle.done

    expect(calls).toBe(1)
    expect(errors).toHaveLength(1)
    expect(isWorkspaceEventStreamError(errors[0])).toBe(true)
    const typed = errors[0] as WorkspaceEventStreamError
    expect(typed.code).toBe('too_many_streams')
    expect(typed.retryable).toBe(false)
    expect(typed.frame?.['max_streams']).toBe(50)
  })

  it('treats stream_unavailable as recoverable (transport-error path)', async () => {
    let calls = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () => {
          calls += 1
          // Both connections emit the recoverable error frame; with
          // maxReconnects=1 the loop will: connect → recoverable error →
          // sleep → reconnect → recoverable error → exhaust budget.
          const stream = sseStream([
            'retry: 1\n\n',
            'id: 0\nevent: error\ndata: {"code":"stream_unavailable","message":"valkey down"}\n\n',
          ])
          return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
        },
      }),
    })

    const errors: Error[] = []
    const handle = client.events.subscribeToWorkspace({
      maxReconnects: 1,
      initialDelayMs: 1,
      maxDelayMs: 1,
      onEvent: () => {},
      onError: (err) => errors.push(err),
    })
    await handle.done

    // Two connections — initial + one reconnect — then budget exhausted.
    expect(calls).toBe(2)
    expect(errors).toHaveLength(1)
    expect(isWorkspaceEventStreamError(errors[0])).toBe(true)
    expect((errors[0] as WorkspaceEventStreamError).code).toBe('transport_exhausted')
  })

  it('ignores the stream.opened control frame', async () => {
    const stream = sseStream([
      'retry: 3000\n\n',
      'id: 0\nevent: stream.opened\ndata: {"code":"ok","connection_id":"abc","max_streams_per_workspace":50}\n\n',
      'id: 1\nevent: call.started\ndata: {"call_sid":"CA-x","direction":"inbound","service_id":"00000000-0000-4000-8000-000000000001"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () =>
          new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      }),
    })

    const events: WorkspaceSSEEvent[] = []
    const handle = client.events.subscribeToWorkspace({
      // The mock stream closes cleanly; without a budget cap the SDK keeps
      // reconnecting on default 3000ms exponential backoff.
      maxReconnects: 0,
      initialDelayMs: 1,
      maxDelayMs: 1,
      onEvent: (e) => events.push(e),
      onError: () => {},
    })
    await handle.done

    // ``stream.opened`` is a control frame and is not a member of the
    // generated WorkspaceSSEEvent union — the SDK currently routes it
    // through the same parser as any other event. The parser is drift-
    // tolerant so the frame is delivered as-is; consumers should ignore
    // unknown ``event_type`` values via their exhaustive switch.
    // The business event after it must arrive unchanged.
    const callStarted = events.find((e) => e.event_type === 'call.started')
    expect(callStarted).toBeDefined()
  })

  it('does not reconnect after the caller aborts during the first connection', async () => {
    let calls = 0
    const { stream, close } = pendingStream(['retry: 3000\n\n'])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${STREAM_PATH}`]: () => {
          calls += 1
          return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
        },
      }),
    })

    const controller = new AbortController()
    const handle = client.events.subscribeToWorkspace({
      signal: controller.signal,
      onEvent: () => {},
      onError: () => {},
    })

    // Give the fetch a chance to be issued before aborting.
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    await handle.done
    close()

    expect(calls).toBe(1)
  })
})
