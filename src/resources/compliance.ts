import { WorkspaceScopedResource, extractData } from './base.js'

export class ComplianceResource extends WorkspaceScopedResource {
  async getDashboard() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/compliance/dashboard', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async getHipaa(params?: { report_period_days?: number }) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/compliance/hipaa', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  async getAccessReview() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/compliance/access-review', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }
}
