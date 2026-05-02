import { WorkspaceScopedResource, extractData } from './base.js'

export interface CrmSearchParams {
  q?: string
  limit?: number
  offset?: number
}

/**
 * CRM — read-mostly view of contacts, companies, deals, and pipeline state
 * sourced from the connected CRM integration (HubSpot/Salesforce/etc.).
 *
 * The platform refreshes this view in the background; the SDK exposes search
 * + detail endpoints plus a per-contact activity timeline. Writes happen
 * upstream in the CRM itself, not here.
 */
export class CrmResource extends WorkspaceScopedResource {
  /** Health/status of the workspace's CRM integration sync */
  async getStatus() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/crm/status', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  readonly contacts = {
    list: async (params?: CrmSearchParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/contacts', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    get: async (contactId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/contacts/{contact_id}', {
          params: { path: { workspace_id: this.workspaceId, contact_id: contactId } },
        }),
      ),

    /** Per-contact activity timeline (calls, emails, deal events) */
    getTimeline: async (contactId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/contacts/{contact_id}/timeline', {
          params: { path: { workspace_id: this.workspaceId, contact_id: contactId } },
        }),
      ),
  }

  readonly companies = {
    list: async (params?: CrmSearchParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/companies', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    get: async (companyId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/companies/{company_id}', {
          params: { path: { workspace_id: this.workspaceId, company_id: companyId } },
        }),
      ),
  }

  readonly deals = {
    list: async (params?: CrmSearchParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/deals', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    get: async (dealId: string) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/deals/{deal_id}', {
          params: { path: { workspace_id: this.workspaceId, deal_id: dealId } },
        }),
      ),

    /** Aggregated pipeline view: deals grouped by stage with rolled-up totals */
    getPipeline: async () =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/crm/deals/pipeline', {
          params: { path: { workspace_id: this.workspaceId } },
        }),
      ),
  }
}
