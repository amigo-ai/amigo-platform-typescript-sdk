import type { components } from '../generated/api.js'
import { WorkspaceScopedResource } from './base.js'

type TurnRequest = components['schemas']['TurnRequest']

export type TurnStreamEvent = components['schemas']['TurnStreamEvent']
export type TurnTokenEvent = components['schemas']['TurnTokenEvent']
export type TurnToolCallStartedEvent = components['schemas']['TurnToolCallStartedEvent']
export type TurnToolCallCompletedEvent = components['schemas']['TurnToolCallCompletedEvent']
export type TurnThinkingEvent = components['schemas']['TurnThinkingEvent']
export type TurnMessageEvent = components['schemas']['TurnMessageEvent']
export type TurnDoneEvent = components['schemas']['TurnDoneEvent']
export type TurnErrorEvent = components['schemas']['TurnErrorEvent']

/** Access streaming text conversation APIs. */
export class ConversationStreamsResource extends WorkspaceScopedResource {
  /**
   * Send a message and receive the agent's response as an SSE byte stream.
   *
   * Targets the explicit always-SSE endpoint
   * `POST /v1/{ws}/conversations/{id}/turns/stream`, so the response is
   * always `text/event-stream` regardless of `Accept` negotiation. Returns
   * a `ReadableStream` of raw bytes; use `EventSourceParserStream` (from
   * `eventsource-parser/stream`) to parse into typed `TurnStreamEvent`,
   * or use the higher-level {@link streamTurn} which hides the parser.
   *
   * @example
   * ```ts
   * const stream = await client.conversationStreams.createTurnStream(convId, { message: "Hello" });
   * const events = stream
   *   .pipeThrough(new TextDecoderStream())
   *   .pipeThrough(new EventSourceParserStream());
   * for await (const event of events) {
   *   const parsed = JSON.parse(event.data) as TurnStreamEvent;
   *   if (parsed.event === "token") console.log(parsed.text);
   * }
   * ```
   */
  async createTurnStream(
    conversationId: string,
    request: TurnRequest,
    options?: { signal?: AbortSignal; includeToolCalls?: boolean },
  ): Promise<ReadableStream<Uint8Array>> {
    const result = await this.client.POST(
      '/v1/{workspace_id}/conversations/{conversation_id}/turns/stream',
      {
        params: {
          path: { workspace_id: this.workspaceId, conversation_id: conversationId },
          ...(options?.includeToolCalls !== undefined && {
            query: { include_tool_calls: options.includeToolCalls },
          }),
        },
        body: request,
        parseAs: 'stream',
        signal: options?.signal,
      },
    )
    if (result.error !== undefined) {
      throw new Error(`API error: ${JSON.stringify(result.error)}`)
    }
    return result.data as ReadableStream<Uint8Array>
  }

  /**
   * Send a message and receive the agent's response as a typed
   * `TurnStreamEvent` async iterable.
   *
   * The bytes-and-parser dance from `createTurnStream` is hidden inside
   * the SDK. Each yielded value is a member of the `TurnStreamEvent`
   * discriminated union (`token`, `thinking`, `tool_call_started`,
   * `tool_call_completed`, `message`, `done`, `error`), validated as a
   * record with a known `event` discriminator. Unknown / malformed frames
   * are dropped silently.
   *
   * @example
   * ```ts
   * for await (const event of client.conversationStreams.streamTurn(convId, { message: "Hello" })) {
   *   if (event.event === "token") process.stdout.write(event.text);
   *   else if (event.event === "done") break;
   * }
   * ```
   */
  async *streamTurn(
    conversationId: string,
    request: TurnRequest,
    options?: { signal?: AbortSignal; includeToolCalls?: boolean },
  ): AsyncGenerator<TurnStreamEvent> {
    const byteStream = await this.createTurnStream(conversationId, request, options)
    for await (const frame of parseSSEFrames(byteStream)) {
      const event = parseTurnStreamFrame(frame.event, frame.data)
      if (event) yield event
    }
  }
}

// ---------------------------------------------------------------------------
// Inline SSE parser
//
// Implemented inline rather than depending on `eventsource-parser` so the SDK
// stays at two runtime deps (`openapi-fetch`, `openapi-typescript-helpers`).
// SSE is simple enough that a small state machine reads cleaner than a
// transitive bundle increase. Spec: https://html.spec.whatwg.org/multipage/server-sent-events.html
// (handled fields: `event`, `data`; comments and `id`/`retry` are ignored).
// ---------------------------------------------------------------------------

interface SSEFrame {
  event: string
  data: string
}

async function* parseSSEFrames(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  function* drain(text: string): Generator<SSEFrame> {
    buffer += text
    // Frames are terminated by a blank line (\n\n or \r\n\r\n).
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
    // Flush any partial decode + handle a final frame missing the trailing
    // blank line (defensive — well-behaved servers always terminate).
    yield* drain(decoder.decode())
    if (buffer.trim().length > 0) {
      const frame = parseSSEBlock(buffer)
      if (frame) yield frame
      buffer = ''
    }
  } finally {
    reader.releaseLock()
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
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }
  if (!event || dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

const KNOWN_TURN_STREAM_EVENTS: ReadonlySet<TurnStreamEvent['event']> = new Set([
  'token',
  'thinking',
  'tool_call_started',
  'tool_call_completed',
  'message',
  'done',
  'error',
])

function parseTurnStreamFrame(eventName: string, dataJson: string): TurnStreamEvent | null {
  if (!(KNOWN_TURN_STREAM_EVENTS as ReadonlySet<string>).has(eventName)) return null
  let payload: unknown
  try {
    payload = JSON.parse(dataJson)
  } catch {
    return null
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  // Server omits the discriminator from the JSON body (it lives in the SSE
  // `event:` line). Reattach it so the union member is well-formed.
  return { ...(payload as Record<string, unknown>), event: eventName } as TurnStreamEvent
}
