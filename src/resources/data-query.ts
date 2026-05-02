import { WorkspaceScopedResource, extractData } from './base.js'

export interface DataQueryParams {
  /** SQL-style filter clause applied server-side */
  filter?: string
  /** Comma-separated columns to return (default: all) */
  columns?: string
  limit?: number
  offset?: number
  order_by?: string
}

/**
 * Generic typed data query — read rows from any whitelisted schema/table the
 * workspace exposes. Backed by the platform's catalog of analytics-grade
 * datasets; the schema and table are validated server-side.
 *
 * Used by the developer console's data-explorer surface.
 */
export class DataQueryResource extends WorkspaceScopedResource {
  /** Run a tabular query against a workspace dataset */
  async run(schema: string, table: string, params?: DataQueryParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/query/{schema}/{table}', {
        params: {
          path: { workspace_id: this.workspaceId, schema, table },
          query: params,
        },
      }),
    )
  }
}
