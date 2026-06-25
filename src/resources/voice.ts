import type { components } from '../generated/api.js'

/** Provider constants derived from OpenAPI voice control-plane enums. */

export type VoiceSessionProvider = NonNullable<
  components['schemas']['ServiceVoiceConfig-Input']['session_provider']
>
export type SttProvider = NonNullable<components['schemas']['VoiceSettingsRequest']['stt_provider']>
export type TtsProvider = NonNullable<components['schemas']['VoiceSettingsRequest']['tts_provider']>

export type ServiceVoiceConfigInput = components['schemas']['ServiceVoiceConfig-Input']
export type ServiceVoiceConfigOutput = components['schemas']['ServiceVoiceConfig-Output']
export type AgentVoiceConfig = components['schemas']['VoiceConfig']
export type VoiceSettingsRequest = components['schemas']['VoiceSettingsRequest']
export type VoiceSettingsResponse = components['schemas']['VoiceSettingsResponse']

type ExhaustiveProviderList<Union extends string, Values extends readonly Union[]> =
  Exclude<Union, Values[number]> extends never ? Values : never

const voiceSessionProviders = [
  'inhouse',
  'openai_realtime',
  'atlas',
] as const satisfies readonly VoiceSessionProvider[]
export const VOICE_SESSION_PROVIDERS = voiceSessionProviders satisfies ExhaustiveProviderList<
  VoiceSessionProvider,
  typeof voiceSessionProviders
>

const sttProviders = [
  'deepgram',
  'openai',
  // Cartesia ink-2 is a supported streaming STT provider behind platform routing gates.
  'cartesia',
] as const satisfies readonly SttProvider[]
export const STT_PROVIDERS = sttProviders satisfies ExhaustiveProviderList<
  SttProvider,
  typeof sttProviders
>

const ttsProviders = ['cartesia', 'elevenlabs', 'groq'] as const satisfies readonly TtsProvider[]
export const TTS_PROVIDERS = ttsProviders satisfies ExhaustiveProviderList<
  TtsProvider,
  typeof ttsProviders
>
