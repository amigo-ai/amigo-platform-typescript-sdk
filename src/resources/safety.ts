import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export class SafetyResource extends WorkspaceScopedResource {
  async getConfig() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/safety/config', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async updateConfig(body: components['schemas']['UpdateSafetyConfigRequest']) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/safety/config', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async listTemplates() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/safety/templates', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async getTemplate(templateId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/safety/templates/{template_id}', {
        params: { path: { workspace_id: this.workspaceId, template_id: templateId } },
      }),
    )
  }

  async applyTemplate(templateId: string, body: components['schemas']['ApplyTemplateRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/safety/templates/{template_id}/apply', {
        params: { path: { workspace_id: this.workspaceId, template_id: templateId } },
        body,
      }),
    )
  }
}
