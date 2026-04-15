import { WorkspaceScopedResource } from './base.js'

// ---------------------------------------------------------------------------
// Voice settings
// ---------------------------------------------------------------------------

export interface VoiceSettings {
  voice_id: string | null
  speed: number | null
  tone: string | null
  volume: number | null
  language: string | null
  keyterms: string[]
  sensitive_topics: string[]
  correction_categories: string[]
  pronunciation_dict_id: string | null
  post_call_analysis_enabled: boolean
  transcript_correction_enabled: boolean
}

// ---------------------------------------------------------------------------
// Branding settings
// ---------------------------------------------------------------------------

export interface BrandingConfig {
  display_name: string | null
  logo_url: string | null
  primary_color: string | null
  support_email: string | null
}

export interface BrandingSettings {
  branding: BrandingConfig
}

// ---------------------------------------------------------------------------
// Outreach settings
// ---------------------------------------------------------------------------

export interface OutreachRule {
  name: string
  condition: Record<string, unknown>
  actions: Record<string, unknown>[]
}

export interface OutreachSettings {
  rules: OutreachRule[]
  data_templates: Record<string, unknown>[]
}

// ---------------------------------------------------------------------------
// Memory settings
// ---------------------------------------------------------------------------

export interface MemoryDimensionConfig {
  name: string
  enabled: boolean
  weight: number
  extraction_mode: string
}

export interface MemorySettings {
  dimensions: MemoryDimensionConfig[]
  backfill_requested: boolean
}

// ---------------------------------------------------------------------------
// Security settings
// ---------------------------------------------------------------------------

export interface SecuritySettings {
  voice_auth_enabled: boolean
}

// ---------------------------------------------------------------------------
// Retention settings
// ---------------------------------------------------------------------------

export interface RetentionSettings {
  call_recordings_days: number | null
  call_transcripts_days: number | null
  phi_data_days: number | null
  world_events_days: number | null
  audit_log_days: number | null
  legal_hold: boolean
  legal_hold_reason: string | null
}

// ---------------------------------------------------------------------------
// Workflow settings
// ---------------------------------------------------------------------------

export interface WorkflowConfig {
  name: string
  trigger: Record<string, unknown>
  actions: Record<string, unknown>[]
  enabled: boolean
}

export interface WorkflowSettings {
  workflows: WorkflowConfig[]
}

/**
 * Workspace-level settings — configure voice behavior, branding, security
 * policies, data retention, outreach rules, and more.
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

  readonly voice = {
    get: (): Promise<VoiceSettings> => this.getSettings('voice'),
    update: (body: Partial<VoiceSettings>): Promise<VoiceSettings> =>
      this.updateSettings('voice', body),
  }

  readonly branding = {
    get: (): Promise<BrandingSettings> => this.getSettings('branding'),
    update: (body: Partial<BrandingSettings>): Promise<BrandingSettings> =>
      this.updateSettings('branding', body),
  }

  readonly outreach = {
    get: (): Promise<OutreachSettings> => this.getSettings('outreach'),
    update: (body: Partial<OutreachSettings>): Promise<OutreachSettings> =>
      this.updateSettings('outreach', body),
  }

  readonly memory = {
    get: (): Promise<MemorySettings> => this.getSettings('memory'),
    update: (body: Partial<MemorySettings>): Promise<MemorySettings> =>
      this.updateSettings('memory', body),
  }

  readonly security = {
    get: (): Promise<SecuritySettings> => this.getSettings('security'),
    update: (body: Partial<SecuritySettings>): Promise<SecuritySettings> =>
      this.updateSettings('security', body),
  }

  readonly retention = {
    get: (): Promise<RetentionSettings> => this.getSettings('retention'),
    update: (body: Partial<RetentionSettings>): Promise<RetentionSettings> =>
      this.updateSettings('retention', body),
  }

  readonly workflows = {
    get: (): Promise<WorkflowSettings> => this.getSettings('workflows'),
    update: (body: Partial<WorkflowSettings>): Promise<WorkflowSettings> =>
      this.updateSettings('workflows', body),
  }
}
