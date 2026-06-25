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

// Force constant arrays to list every OpenAPI enum member after a spec refresh.
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

const sttProviders = ['deepgram', 'openai', 'cartesia'] as const satisfies readonly SttProvider[]
/**
 * Supported STT provider ids from the platform schema.
 *
 * Provider availability can still be workspace- or environment-gated at runtime
 * (for example Cartesia ink-2), so treat this as the contract enum, not an
 * entitlement check for a specific workspace.
 */
export const STT_PROVIDERS = sttProviders satisfies ExhaustiveProviderList<
  SttProvider,
  typeof sttProviders
>

const ttsProviders = ['cartesia', 'elevenlabs', 'groq'] as const satisfies readonly TtsProvider[]
export const TTS_PROVIDERS = ttsProviders satisfies ExhaustiveProviderList<
  TtsProvider,
  typeof ttsProviders
>
