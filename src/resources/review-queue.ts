import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListReviewItemsParams extends ListParams {
  status?: string | null
  entity_type?: string | null
  priority?: number | null
  reason?: string | null
  assigned_to?: string | null
  created_after?: string | null
  created_before?: string | null
  sort_by?: string | null
  sort_order?: string
}

export interface ReviewHistoryParams extends ListParams {
  action?: string | null
  reviewed_by?: string | null
  completed_after?: string | null
  completed_before?: string | null
}

export class ReviewQueueResource extends WorkspaceScopedResource {
  async list(params?: ListReviewItemsParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListReviewItemsParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  async get(itemId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/{item_id}', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
      }),
    )
  }

  async getStats() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/stats', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async getDashboard() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/dashboard', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async getMyQueue(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/my-queue', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  getMyQueueAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.getMyQueue(pageParams), params)
  }

  async approve(itemId: string, body: components['schemas']['ApproveRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/{item_id}/approve', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
        body,
      }),
    )
  }

  async reject(itemId: string, body: components['schemas']['RejectRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/{item_id}/reject', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
        body,
      }),
    )
  }

  async claim(itemId: string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/{item_id}/claim', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
      }),
    )
  }

  async unclaim(itemId: string) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/{item_id}/unclaim', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
      }),
    )
  }

  async correct(itemId: string, body: components['schemas']['CorrectRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/{item_id}/correct', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
        body,
      }),
    )
  }

  async batchApprove(body: components['schemas']['BatchApproveRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/batch-approve', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async batchReject(body: components['schemas']['BatchRejectRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/review-queue/batch-reject', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async getHistory(params?: ReviewHistoryParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/history', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  getHistoryAutoPaging(params?: ReviewHistoryParams) {
    return this.iteratePaginatedList((pageParams) => this.getHistory(pageParams), params)
  }

  async getTrends(params?: { days?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/trends', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async getPerformance(params?: { days?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/performance', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async getCorrectionSchema(itemId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/{item_id}/correction-schema', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
      }),
    )
  }

  async getDiff(itemId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/review-queue/{item_id}/diff', {
        params: { path: { workspace_id: this.workspaceId, item_id: itemId } },
      }),
    )
  }
}
