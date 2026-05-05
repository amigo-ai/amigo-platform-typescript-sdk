import type { components } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export class FunctionsResource extends WorkspaceScopedResource {
  async list() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async create(body: components['schemas']['FunctionCreateRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async delete(functionName: string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/functions/{function_name}', {
      params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
    })
  }

  async test(functionName: string, body: components['schemas']['FunctionTestRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/test', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  async getCatalog() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/catalog', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  async query(body: components['schemas']['QueryRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/query', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async sync() {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/sync', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  // ── V109 SQL-first surface ────────────────────────────────────────
  // The methods below operate against ``platform.functions`` (the
  // versioned, alias-pinned, typed-parameter table introduced in
  // platform migration V109). The legacy methods above continue to
  // wrap the JSONB-backed ``workspace.settings["functions"]`` shape;
  // both surfaces co-exist so callers can migrate at their own pace.

  /**
   * Validate + register a new platform function version. Atomic:
   * validation + INSERT + ``latest`` alias rebind happen in one
   * transaction. Concurrent deploys race-fail on the UNIQUE
   * constraint and return 409.
   */
  async deploy(body: components['schemas']['RegisteredFunction']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/deploy', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /**
   * List the ``latest`` version of every V109-registered platform
   * function in the workspace. Returns one row per function (the
   * alias-pinned latest version).
   *
   * Distinct from :meth:`list` which reads the legacy
   * ``workspace.settings["functions"]`` JSONB store; both surfaces
   * co-exist while callers migrate. Prefer this for V109 functions.
   */
  async listRegistered() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/registered', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /**
   * List all immutable versions of a registered function, newest first.
   */
  async listVersions(functionName: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/{function_name}/versions', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
      }),
    )
  }

  /**
   * Resolve ``(function_name, alias)`` to a specific version row.
   * Default alias: ``latest``.
   */
  async getVersion(
    functionName: string,
    alias: 'latest' | 'staging' | 'production' = 'latest',
  ) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/functions/{function_name}/version', {
        params: {
          path: { workspace_id: this.workspaceId, function_name: functionName },
          query: { alias },
        },
      }),
    )
  }

  /**
   * Execute a registered function. Bound parameters validated against
   * the version's stored schema; ``ws_id`` auto-injected from request
   * context. Returns the executor's shaped response (rows for
   * ``returns=table``, scalar for ``returns=scalar``).
   */
  async invoke(
    functionName: string,
    body: components['schemas']['InvokeRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/invoke', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  /**
   * Test invoke — same as ``invoke`` plus persists ``last_test_*``
   * telemetry on the version row so the DC tool list can show
   * health without re-running.
   *
   * Returns :type:`TestInvokeResponse` (superset of `InvokeResponse`)
   * so callers can read ``status`` / ``error`` / ``test_duration_ms``
   * directly off the response. The platform-api route catches
   * ``ServiceUnavailableError`` and converts it into ``status='fail'``
   * with the executor's error string in ``error`` — so even on a
   * blown-up SQL execution the response is a 200 with the failure
   * detail surfaced to the caller.
   */
  async testV2(
    functionName: string,
    body: components['schemas']['InvokeRequest'],
  ): Promise<components['schemas']['TestInvokeResponse']> {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/v2/test', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  /**
   * Rebind an alias (``latest`` / ``staging`` / ``production``) to a
   * specific version. Verifies the version exists before rebinding.
   */
  async promote(
    functionName: string,
    body: components['schemas']['PromoteRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/promote', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }

  /**
   * Rebind ``latest`` and ``production`` to a prior version. The
   * "oops the new deploy was bad" path. ``staging`` stays untouched.
   */
  async rollback(
    functionName: string,
    body: components['schemas']['RollbackRequest'],
  ) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/functions/{function_name}/rollback', {
        params: { path: { workspace_id: this.workspaceId, function_name: functionName } },
        body,
      }),
    )
  }
}
