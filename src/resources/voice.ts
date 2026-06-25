import type { components } from '../generated/api.js'

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

type AssertNoMissingProvider<T extends never> = T

export const VOICE_SESSION_PROVIDERS = [
  'inhouse',
  'openai_realtime',
  'atlas',
] as const satisfies readonly VoiceSessionProvider[]
export type _VoiceSessionProvidersExhaustive = AssertNoMissingProvider<
  Exclude<VoiceSessionProvider, (typeof VOICE_SESSION_PROVIDERS)[number]>
>

export const STT_PROVIDERS = [
  'deepgram',
  'openai',
  'cartesia',
] as const satisfies readonly SttProvider[]
export type _SttProvidersExhaustive = AssertNoMissingProvider<
  Exclude<SttProvider, (typeof STT_PROVIDERS)[number]>
>

export const TTS_PROVIDERS = [
  'cartesia',
  'elevenlabs',
  'groq',
] as const satisfies readonly TtsProvider[]
export type _TtsProvidersExhaustive = AssertNoMissingProvider<
  Exclude<TtsProvider, (typeof TTS_PROVIDERS)[number]>
>
