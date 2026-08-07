import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

/**
 * Workspace-level settings — configure voice, branding, data
 * retention, outreach rules, and more.
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
    /**
     * Preview which calls would be flagged by the current gap-scanner config.
     *
     * The spec types the body as `GapScannerPreviewRequest | null`, but the
     * `null` branch only matters when the caller wants to *explicitly* clear
     * the body. Modeling as `body?: GapScannerPreviewRequest` keeps the SDK
     * surface consistent with every other POST wrapper; consumers who need
     * to send the literal `null` can do so via `client.POST(...)` directly.
     */
    preview: async (body?: components['schemas']['GapScannerPreviewRequest']) =>
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
}
