/**
 * Base class for workspace-scoped resources.
 *
 * Uses the openapi-fetch client (with auth + error + retry middleware)
 * injected from AmigoClient. Resources call typed HTTP methods that
 * flow through the middleware chain automatically.
 */

import type { Client } from 'openapi-fetch'
import type { paths } from '../generated/api.js'
import { extractData } from '../core/utils.js'

export type PlatformFetch = Client<paths>

export abstract class WorkspaceScopedResource {
  constructor(
    protected readonly client: PlatformFetch,
    protected readonly workspaceId: string,
  ) {}
}

export { extractData }
