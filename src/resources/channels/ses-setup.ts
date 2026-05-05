/**
 * SES setup resource — workspace-scoped CRUD over the channel-manager-backed
 * SES setup proxy at ``/v1/{workspace_id}/channels/ses-setup``.
 *
 * Use SES setups to register a verified sending domain (e.g.
 * ``mail.acme.com``) that can then back one or more email use cases. The
 * caller publishes the returned DNS records (DKIM CNAMEs, MX, DMARC TXT)
 * at their DNS provider; subsequent ``get`` or ``verify`` calls re-run the
 * live DNS lookup and update each record's ``verified`` flag.
 */

import type { components } from '../../generated/api.js'
import type { ListParams } from '../../core/utils.js'
import { WorkspaceScopedResource, extractData } from '../base.js'

// Re-export the generated schema types verbatim — never hand-roll a parallel
// shape that drifts from openapi.json. Naming preserved at the package root
// so the public API surface matches the SDK convention (drop the `Response`
// suffix; consumers think in terms of resource shapes, not REST artifacts).
export type CreateSesSetupRequest = components['schemas']['CreateSesSetupRequest']
export type SesSetupDetail = components['schemas']['SesSetupDetailResponse']
export type SesSetupListItem = components['schemas']['SesSetupListItemResponse']
export type DnsRecord = components['schemas']['DnsRecordResponse']
// Named alias for the paginated list response so consumers can annotate
// variables with the public type rather than reaching into the generated
// schema by string. The underlying schema name is openapi-typescript's
// double-underscore encoding of FastAPI's parameterized generic; aliasing
// it here gives us a stable rename point if the generator output shifts.
export type SesSetupListResponse =
  components['schemas']['PaginatedResponse_SesSetupListItemResponse_']

export class SesSetupResource extends WorkspaceScopedResource {
  /**
   * Create an SES tenant + verified domain identity for this workspace.
   *
   * Returns the DNS records the customer must publish at their DNS provider.
   * The setup is unusable for sending until every record's ``verified`` flag
   * flips to ``true`` (call ``verify`` after publishing DNS to refresh).
   */
  async create(body: CreateSesSetupRequest): Promise<SesSetupDetail> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/channels/ses-setup', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /**
   * List SES setups owned by this workspace.
   *
   * Each item carries the cached ``dns_verified`` aggregate; call ``get``
   * for per-record DNS detail.
   */
  async list(params?: ListParams): Promise<SesSetupListResponse> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/channels/ses-setup', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Auto-paginating async iterable over every SES setup in the workspace. */
  listAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /**
   * Get an SES setup with a live DNS verification refresh.
   *
   * Channel-manager re-runs ``GetEmailIdentity`` + DMARC/MX resolvers on
   * every call, so each ``get`` is a live check rather than a cache read.
   */
  async get(setupId: string): Promise<SesSetupDetail> {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/channels/ses-setup/{setup_id}', {
        params: { path: { workspace_id: this.workspaceId, setup_id: setupId } },
      }),
    )
  }

  /**
   * Explicit DNS refresh — equivalent to ``get`` but exposed as a POST so UI
   * "Verify now" actions read as actions rather than reads.
   */
  async verify(setupId: string): Promise<SesSetupDetail> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/channels/ses-setup/{setup_id}/verify', {
        params: { path: { workspace_id: this.workspaceId, setup_id: setupId } },
      }),
    )
  }

  /**
   * Tear down the upstream SES tenant + identity and soft-delete the
   * workspace binding. Throws ``ConflictError`` (HTTP 409) if any use case
   * still references the setup — delete those use cases first.
   *
   * Routed through ``extractData`` so 4xx/5xx responses surface as typed
   * SDK errors (matching every other resource's ``delete``); the
   * ``ConflictError`` mapping fires here instead of relying on the
   * underlying client's accidental throw.
   */
  async delete(setupId: string): Promise<void> {
    return extractData(
      await this.client.DELETE('/v1/{workspace_id}/channels/ses-setup/{setup_id}', {
        params: { path: { workspace_id: this.workspaceId, setup_id: setupId } },
      }),
    )
  }
}
