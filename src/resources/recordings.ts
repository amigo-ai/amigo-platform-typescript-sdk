import { WorkspaceScopedResource, extractData } from './base.js'

export class RecordingsResource extends WorkspaceScopedResource {
  /** Presigned S3 URLs for the inbound (caller), outbound (agent), and merged stereo WAVs. */
  async get(callSid: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/recordings/{call_sid}', {
        params: { path: { workspace_id: this.workspaceId, call_sid: callSid } },
      }),
    )
  }
}
