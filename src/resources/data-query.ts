import type { paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export type DataQueryParams = NonNullable<
  paths['/v1/{workspace_id}/query/{schema}/{table}']['get']['parameters']['query']
>

/**
 * Generic typed data query — read rows from any whitelisted schema/table the
 * workspace exposes. Backed by the platform's catalog of analytics-grade
 * datasets; the schema and table are validated server-side.
 *
 * Used by the developer console's data-explorer surface.
 *
 * @beta New in this release; surface may evolve.
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
