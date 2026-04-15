import type { UsageSummary, Invoice, PaginatedResponse } from '../types/api.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'

export interface UsageQueryParams {
  start_date?: string
  end_date?: string
}

/**
 * Billing — usage summaries and invoices.
 */
export class BillingResource extends WorkspaceScopedResource {
  /** Get usage summary for a time period */
  async getUsage(params?: UsageQueryParams): Promise<UsageSummary> {
    return this.fetch<UsageSummary>(`/billing/usage${buildQuery(params)}`)
  }

  /** List invoices */
  async listInvoices(params?: { limit?: number; continuation_token?: number }): Promise<PaginatedResponse<Invoice>> {
    return this.fetch<PaginatedResponse<Invoice>>(`/billing/invoices${buildQuery(params)}`)
  }
}
