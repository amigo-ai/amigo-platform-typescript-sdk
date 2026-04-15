import { WorkspaceScopedResource } from './base.js'

export interface SqlQueryRequest {
  sql: string
  parameters?: Record<string, unknown>
  limit?: number
}

export interface SqlQueryResponse {
  columns: string[]
  rows: unknown[][]
  row_count: number
  execution_time_ms: number
}

export interface AggregateQueryRequest {
  entity_type?: string
  event_type?: string
  metric: 'count' | 'sum' | 'avg' | 'min' | 'max'
  field?: string
  group_by?: string[]
  filters?: Record<string, unknown>
  start_date?: string
  end_date?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
}

export interface AggregateQueryResponse {
  results: Array<{
    group: Record<string, unknown>
    value: number
    period?: string
  }>
  total: number
}

/**
 * Query your workspace data directly.
 *
 * `sql` — run parameterized SQL against your Lakebase workspace schema.
 * `aggregate` — structured aggregation queries without writing SQL.
 *
 * @example
 * const result = await client.query.sql({
 *   sql: 'SELECT entity_type, COUNT(*) as n FROM world.entities WHERE workspace_id = :ws GROUP BY entity_type',
 *   parameters: { ws: workspaceId },
 * })
 */
export class QueryResource extends WorkspaceScopedResource {
  /** Execute a parameterized SQL query against your workspace data */
  async sql(body: SqlQueryRequest): Promise<SqlQueryResponse> {
    return this.fetch<SqlQueryResponse>('/query/sql', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** Run a structured aggregation query — no SQL required */
  async aggregate(body: AggregateQueryRequest): Promise<AggregateQueryResponse> {
    return this.fetch<AggregateQueryResponse>('/query/aggregate', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}
