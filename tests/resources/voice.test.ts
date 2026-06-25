import { describe, expect, it } from 'vitest'
import { STT_PROVIDERS, TTS_PROVIDERS, VOICE_SESSION_PROVIDERS } from '../../src/index.js'

describe('voice provider constants', () => {
  it('exposes supported voice session providers', () => {
    expect(VOICE_SESSION_PROVIDERS).toEqual(['inhouse', 'openai_realtime', 'atlas'])
  })

  it('exposes supported STT providers', () => {
    expect(STT_PROVIDERS).toEqual(['deepgram', 'openai', 'cartesia'])
  })

  it('exposes supported TTS providers', () => {
    expect(TTS_PROVIDERS).toEqual(['cartesia', 'elevenlabs', 'groq'])
  })
})
