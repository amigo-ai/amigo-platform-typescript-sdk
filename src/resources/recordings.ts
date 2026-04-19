import { WorkspaceScopedResource, extractData } from './base.js'

export class RecordingsResource extends WorkspaceScopedResource {
  async getUrls(callSid: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/recordings/{call_sid}/urls', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
      }),
    )
  }

  async getMetadata(callSid: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/recordings/{call_sid}/metadata', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
      }),
    )
  }

  async download(callSid: string, filename: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/recordings/{call_sid}/download/{filename}', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid, filename } },
      }),
    )
  }
}
