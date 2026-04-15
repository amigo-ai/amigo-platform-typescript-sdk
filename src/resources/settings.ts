import { WorkspaceScopedResource } from './base.js'

// Individual settings shapes — extend as the API schema evolves

export interface VoiceSettings {
  default_voice_id: string | null
  speech_rate: number | null
  filler_words_enabled: boolean
  interruption_sensitivity: 'low' | 'medium' | 'high'
  silence_timeout_seconds: number
}

export interface BrandingSettings {
  display_name: string | null
  logo_url: string | null
  primary_color: string | null
  support_email: string | null
}

export interface OutreachSettings {
  max_attempts: number
  attempt_interval_hours: number
  allowed_call_windows: Array<{ day: string; start: string; end: string }>
  timezone: string
  opt_out_message: string | null
}

export interface MemorySettings {
  retention_days: number
  entity_types_enabled: string[]
  auto_merge_enabled: boolean
  confidence_threshold: number
}

export interface SecuritySettings {
  require_mfa: boolean
  allowed_ip_ranges: string[]
  session_timeout_minutes: number
  api_key_max_duration_days: number
}

export interface BehaviorSettings {
  escalation_enabled: boolean
  escalation_threshold: number
  fallback_message: string | null
  max_conversation_turns: number
}

export interface RetentionSettings {
  call_recording_days: number
  transcript_days: number
  event_days: number
  audit_log_days: number
}

export interface WorkflowSettings {
  auto_assign_enabled: boolean
  default_queue: string | null
  routing_rules: Array<{ condition: Record<string, unknown>; queue: string }>
}

/**
 * Workspace-level settings — configure voice behavior, branding, outreach rules,
 * security policies, data retention, and more.
 *
 * Each sub-resource has `get()` and `update()`.
 */
export class SettingsResource extends WorkspaceScopedResource {
  private async getSettings<T>(key: string): Promise<T> {
    return this.fetch<T>(`/settings/${key}`)
  }

  private async updateSettings<T>(key: string, body: Partial<T>): Promise<T> {
    return this.fetch<T>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  // ---- Voice ----
  readonly voice = {
    get: (): Promise<VoiceSettings> => this.getSettings('voice'),
    update: (body: Partial<VoiceSettings>): Promise<VoiceSettings> =>
      this.updateSettings('voice', body),
  }

  // ---- Branding ----
  readonly branding = {
    get: (): Promise<BrandingSettings> => this.getSettings('branding'),
    update: (body: Partial<BrandingSettings>): Promise<BrandingSettings> =>
      this.updateSettings('branding', body),
  }

  // ---- Outreach ----
  readonly outreach = {
    get: (): Promise<OutreachSettings> => this.getSettings('outreach'),
    update: (body: Partial<OutreachSettings>): Promise<OutreachSettings> =>
      this.updateSettings('outreach', body),
  }

  // ---- Memory ----
  readonly memory = {
    get: (): Promise<MemorySettings> => this.getSettings('memory'),
    update: (body: Partial<MemorySettings>): Promise<MemorySettings> =>
      this.updateSettings('memory', body),
  }

  // ---- Security ----
  readonly security = {
    get: (): Promise<SecuritySettings> => this.getSettings('security'),
    update: (body: Partial<SecuritySettings>): Promise<SecuritySettings> =>
      this.updateSettings('security', body),
  }

  // ---- Behaviors ----
  readonly behaviors = {
    get: (): Promise<BehaviorSettings> => this.getSettings('behaviors'),
    update: (body: Partial<BehaviorSettings>): Promise<BehaviorSettings> =>
      this.updateSettings('behaviors', body),
  }

  // ---- Retention ----
  readonly retention = {
    get: (): Promise<RetentionSettings> => this.getSettings('retention'),
    update: (body: Partial<RetentionSettings>): Promise<RetentionSettings> =>
      this.updateSettings('retention', body),
  }

  // ---- Workflows ----
  readonly workflows = {
    get: (): Promise<WorkflowSettings> => this.getSettings('workflows'),
    update: (body: Partial<WorkflowSettings>): Promise<WorkflowSettings> =>
      this.updateSettings('workflows', body),
  }
}
