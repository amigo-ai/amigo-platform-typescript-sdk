import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListInvoicesParams extends ListParams {
  status?: 'draft' | 'sent' | 'paid' | 'void'
  date_from?: string
  date_to?: string
}

export interface UsageTrendsParams {
  days?: number
  date_from?: string
  date_to?: string
  meter_key?: string
}

/**
 * Billing — dashboard, usage summaries, invoices, and usage trends.
 */
export class BillingResource extends WorkspaceScopedResource {
  /** Get composite billing dashboard — KPIs, period comparison, top meters, invoice summary */
  async getDashboard() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/dashboard', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get usage summary for the workspace */
  async getUsage() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/usage', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** Get usage time-series per meter for trend charts */
  async getUsageTrends(params?: UsageTrendsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/usage/trends', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** List invoices for the workspace */
  async listInvoices(params?: ListInvoicesParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/invoices', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Get invoice detail */
  async getInvoice(invoiceId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/invoices/{invoice_id}', {
        params: { path: { workspace_id: this.workspaceId, invoice_id: invoiceId } },
      }),
    )
  }

  /** Get presigned S3 URL for invoice PDF download */
  async getInvoicePdf(invoiceId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/billing/invoices/{invoice_id}/pdf', {
        params: { path: { workspace_id: this.workspaceId, invoice_id: invoiceId } },
      }),
    )
  }
}
