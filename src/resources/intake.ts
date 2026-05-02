import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export interface ListIntakeLinksParams {
  include_expired?: boolean
}

/**
 * Intake — short-lived signed links the workspace shares with patients to
 * collect documents (insurance cards, ID, referrals). Each link can receive
 * multiple uploads; uploads are downloadable for audit/review.
 */
export class IntakeResource extends WorkspaceScopedResource {
  readonly links = {
    list: async (params?: ListIntakeLinksParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/intake/links', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    create: async (body: components['schemas']['CreateLinkRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/intake/links', {
          params: { path: { workspace_id: this.workspaceId } },
          body,
        }),
      ),

    delete: async (linkId: string): Promise<void> => {
      await this.client.DELETE('/v1/{workspace_id}/intake/links/{link_id}', {
        params: { path: { workspace_id: this.workspaceId, link_id: linkId } },
      })
    },

    /** List uploads received against a link */
    listUploads: async (linkId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/intake/links/{link_id}/uploads', {
          params: { path: { workspace_id: this.workspaceId, link_id: linkId } },
        }),
      ),

    /** Get a download URL/payload for a single upload */
    downloadUpload: async (linkId: string, uploadId: string) =>
      extractData(
        await this.client.GET(
          '/v1/{workspace_id}/intake/links/{link_id}/uploads/{upload_id}/download',
          {
            params: {
              path: {
                workspace_id: this.workspaceId,
                link_id: linkId,
                upload_id: uploadId,
              },
            },
          },
        ),
      ),
  }

}

// Direct-upload endpoint `/v1/{workspace_id}/intake/files` requires a signed
// header set (x-amigo-intake-{sha256,timestamp,signature,customer-slug,filename})
// and isn't a good fit for the typed resource layer. Consumers can call it via
// `client.POST('/v1/{workspace_id}/intake/files', { params: { header: {...} } })`
// once they have the signed header bundle from the platform.
