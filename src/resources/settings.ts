import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Workspace-level settings — configure voice behavior, branding, security
 * policies, data retention, outreach rules, and more.
 *
 * Each sub-resource has `get()` and `update()`.
 */
export class SettingsResource extends WorkspaceScopedResource {
  readonly voice = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/voice', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['VoiceSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/voice', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly branding = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/branding', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['BrandingSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/branding', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly outreach = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/outreach', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['OutreachSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/outreach', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly memory = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/memory', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['MemorySettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/memory', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly security = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/security', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['SecuritySettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/security', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly retention = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/retention', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['RetentionPolicyRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/retention', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly behaviors = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/behaviors', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['BehaviorSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/behaviors', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly gapScanner = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/gap-scanner', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['GapScannerSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/gap-scanner', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
    /** Preview which calls would be flagged by the current gap-scanner config */
    preview: async (body?: components['schemas']['GapScannerPreviewRequest'] | null) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/settings/gap-scanner/preview', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
    /** Trigger an on-demand scan with the current gap-scanner config */
    scan: async () =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/settings/gap-scanner/scan', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
  }

  readonly scribe = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/scribe', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['ScribeSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/scribe', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly metrics = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/metrics', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['MetricSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/metrics', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly environments = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/environments', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['EnvironmentSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/environments', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }

  readonly workflows = {
    get: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/settings/workflows', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
    update: async (body: components['schemas']['WorkflowSettingsRequest']) =>
      extractData(
        await this.client.PUT('/v1/{workspace_id}/settings/workflows', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),
  }
}
