/**
 * Base class for all workspace-scoped resources.
 * Handles URL construction, auth headers, and error conversion.
 */

import { createApiError } from '../core/errors.js'

export interface ResourceConfig {
  apiKey: string
  baseUrl: string
  workspaceId: string
}

export abstract class WorkspaceScopedResource {
  constructor(protected readonly config: ResourceConfig) {}

  protected get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  protected workspaceUrl(path: string): string {
    return `${this.config.baseUrl}/v1/${this.config.workspaceId}${path}`
  }

  protected async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = this.workspaceUrl(path)
    const response = await globalThis.fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    })
    if (!response.ok) {
      throw await createApiError(response)
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildQuery(params?: any): string {
  if (!params) return ''
  const entries = (Object.entries(params as Record<string, unknown>) as [string, unknown][]).filter(
    ([, v]) => v !== undefined && v !== null,
  )
  if (entries.length === 0) return ''
  const searchParams = new URLSearchParams()
  for (const [k, v] of entries) {
    searchParams.set(k, String(v))
  }
  return '?' + searchParams.toString()
}
