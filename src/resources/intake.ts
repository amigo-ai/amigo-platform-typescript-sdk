import { WorkspaceScopedResource } from './base.js'

export class IntakeResource extends WorkspaceScopedResource {
  async deleteSource(sourceId: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/intake/sources/{source_id}', {
      params: { path: { workspace_id: this.workspaceId, source_id: sourceId } },
    })
  }
}
