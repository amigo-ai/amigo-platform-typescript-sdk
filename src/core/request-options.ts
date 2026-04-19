import type { FetchOptions, HeadersOptions } from 'openapi-fetch'
import type { paths } from '../generated/api.js'
import type { RetryOptions } from './retry.js'

export type OperationFor<
  Path extends keyof paths & string,
  Method extends keyof paths[Path] & string,
> = paths[Path][Method]

type OptionalizeWorkspacePath<PathParams> = PathParams extends { workspace_id: infer WorkspaceId }
  ? Omit<PathParams, 'workspace_id'> & { workspace_id?: WorkspaceId }
  : PathParams

type EmptyShape = Record<never, never>

type RewriteParams<Options> = Options extends { params: infer Params }
  ? RewriteParamShape<Params> extends infer RewrittenParams
    ? RewrittenParams extends object
      ? RequiredKeysOf<RewrittenParams> extends never
        ? Omit<Options, 'params'> & { params?: RewrittenParams }
        : Omit<Options, 'params'> & { params: RewrittenParams }
      : Omit<Options, 'params'> & { params: RewrittenParams }
    : Options
  : Options extends { params?: infer Params }
    ? Omit<Options, 'params'> & { params?: RewriteParamShape<Params> }
    : Options

type RewriteParamShape<Params> = Params extends object
  ? Omit<Params, 'path'> & RewritePathParam<Params>
  : Params

type RewritePathParam<Params> = Params extends { path: infer PathParams }
  ? OptionalizeWorkspacePath<PathParams> extends infer RewrittenPath
    ? RewrittenPath extends object
      ? RequiredKeysOf<RewrittenPath> extends never
        ? { path?: RewrittenPath }
        : { path: RewrittenPath }
      : { path: RewrittenPath }
    : EmptyShape
  : EmptyShape

type RequiredKeysOf<T extends object> = Exclude<
  {
    [K in keyof T]-?: EmptyShape extends Pick<T, K> ? never : K
  }[keyof T],
  undefined
>

export type InitParam<Init extends object> =
  RequiredKeysOf<Init> extends never ? [init?: Init] : [init: Init]

export type AmigoRequestOptions<Operation = unknown> = Omit<
  RewriteParams<FetchOptions<Operation>>,
  'timeout' | 'maxRetries' | 'retry'
> & {
  timeout?: number
  maxRetries?: number
  retry?: RetryOptions
}

export type ScopedRequestOptions = Omit<RequestInit, 'body' | 'headers' | 'method'> & {
  headers?: HeadersOptions
  timeout?: number
  maxRetries?: number
  retry?: RetryOptions
}

export interface RequestControlOptions {
  timeout?: number
  maxRetries?: number
  retry?: RetryOptions
}

type MergeableRequestOptions = object & {
  headers?: HeadersOptions
  signal?: AbortSignal | null
  timeout?: number
  maxRetries?: number
  retry?: RetryOptions
}

export function stripRequestControls<Options extends RequestControlOptions>(
  options: Options | undefined,
): Omit<Options, keyof RequestControlOptions> | undefined {
  if (!options) {
    return undefined
  }

  const rest = { ...options } as Partial<Options & RequestControlOptions>
  delete rest.timeout
  delete rest.maxRetries
  delete rest.retry
  return rest as Omit<Options, keyof RequestControlOptions>
}

export function mergeRequestOptions<Options extends object>(
  base: ScopedRequestOptions | undefined,
  override: Options | undefined,
): (Options & MergeableRequestOptions) | undefined {
  if (!base) {
    return override as (Options & MergeableRequestOptions) | undefined
  }

  if (!override) {
    return base as Options & MergeableRequestOptions
  }

  const mergeableOverride = override as Options & Partial<MergeableRequestOptions>

  return {
    ...base,
    ...override,
    headers: mergeHeaders(base.headers, mergeableOverride.headers),
    signal: mergeableOverride.signal ?? base.signal,
    timeout: mergeableOverride.timeout ?? base.timeout,
    maxRetries: mergeableOverride.maxRetries ?? base.maxRetries,
    retry: mergeableOverride.retry ?? base.retry,
  } as Options & MergeableRequestOptions
}

export function mergeScopedRequestOptions(
  base: ScopedRequestOptions | undefined,
  override: ScopedRequestOptions,
): ScopedRequestOptions {
  return mergeRequestOptions(base, override) ?? override
}

export function mergeHeaders(
  base: HeadersOptions | undefined,
  override: HeadersOptions | undefined,
): Headers | undefined {
  if (!base && !override) {
    return undefined
  }

  const headers = new Headers()
  let hasEntries = false

  applyHeaders(headers, base, () => {
    hasEntries = true
  })
  applyHeaders(headers, override, () => {
    hasEntries = true
  })

  return hasEntries ? headers : undefined
}

function applyHeaders(
  target: Headers,
  source: HeadersOptions | undefined,
  onSet: () => void,
): void {
  if (!source) {
    return
  }

  if (source instanceof Headers) {
    source.forEach((value, key) => {
      target.set(key, value)
      onSet()
    })
    return
  }

  if (Array.isArray(source)) {
    for (const [key, value] of source) {
      if (!key) {
        continue
      }

      if (value === null || value === undefined) {
        target.delete(key)
        continue
      }

      target.set(key, String(value))
      onSet()
    }
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) {
      target.delete(key)
      continue
    }

    target.set(
      key,
      Array.isArray(value) ? value.map((item) => String(item)).join(', ') : String(value),
    )
    onSet()
  }
}
