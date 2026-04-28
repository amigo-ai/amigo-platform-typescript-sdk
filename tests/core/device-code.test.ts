import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loginWithDeviceCode,
  TokenManager,
  MemoryTokenStorage,
  FileTokenStorage,
  DeviceCodeExpiredError,
  DeviceCodeDeniedError,
  RefreshTokenExpiredError,
  LoginCancelledError,
  decodeJwtPayload,
  formatDeviceCodeInstructions,
  formatWorkspaceList,
  type AuthResult,
} from '../../src/index.js'

function makeJwt(claims: Record<string, unknown>): string {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${h}.${p}.sig`
}

function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  })
}

function createFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let i = 0
  return vi.fn().mockImplementation(() => {
    const r = responses[i++] ?? responses[responses.length - 1]!
    return Promise.resolve({
      status: r!.status,
      ok: r!.status >= 200 && r!.status < 300,
      headers: new Headers(),
      json: () => Promise.resolve(r!.body),
    })
  })
}

const ISSUANCE = {
  device_code: 'dc_test',
  user_code: 'ABCD-EFGH',
  verification_uri: 'https://console.amigo.ai/device',
  verification_uri_complete: 'https://console.amigo.ai/device?user_code=ABCD-EFGH',
  expires_in: 900,
  interval: 0.01,
}

const TOKEN = {
  access_token: makeJwt({ sub: 'e1', workspace_id: 'ws1', exp: 9999999999 }),
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'ws:read',
  refresh_token: 'rt_abc',
}

// --- decodeJwtPayload ---

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const jwt = makeJwt({ sub: 'e1', workspace_id: 'ws1', exp: 1700000000 })
    expect(decodeJwtPayload(jwt)).toEqual({ sub: 'e1', workspace_id: 'ws1', exp: 1700000000 })
  })

  it('returns null for wrong segment count', () => {
    expect(decodeJwtPayload('one')).toBeNull()
    expect(decodeJwtPayload('two.parts')).toBeNull()
  })

  it('returns null for malformed base64', () => {
    expect(decodeJwtPayload('h.!!!.s')).toBeNull()
  })
})

// --- loginWithDeviceCode ---

describe('loginWithDeviceCode', () => {
  it('completes full login flow', async () => {
    const onCode = vi.fn()
    const result = await loginWithDeviceCode({
      onCode,
      onWorkspaceRequired: vi.fn(),
      fetch: createFetchSequence([
        { status: 200, body: ISSUANCE },
        { status: 400, body: { error: 'authorization_pending' } },
        { status: 200, body: TOKEN },
      ]),
      identityBaseUrl: 'https://id.test',
    })

    expect(onCode).toHaveBeenCalledWith(ISSUANCE)
    expect(result.workspaceId).toBe('ws1')
    expect(result.refreshToken).toBe('rt_abc')
  })

  it('handles multi-workspace', async () => {
    const multi = {
      error: 'workspace_selection_required',
      workspaces: [{ workspace_id: 'ws-a' }, { workspace_id: 'ws-b' }],
      refresh_token: 'rt_boot',
    }
    const scopedToken = {
      access_token: makeJwt({ sub: 'e1', workspace_id: 'ws-b', exp: 9999999999 }),
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'ws:read',
      refresh_token: 'rt_scoped',
    }

    const onWs = vi.fn().mockResolvedValue('ws-b')
    const result = await loginWithDeviceCode({
      onCode: vi.fn(),
      onWorkspaceRequired: onWs,
      fetch: createFetchSequence([
        { status: 200, body: ISSUANCE },
        { status: 300, body: multi },
        { status: 200, body: scopedToken },
      ]),
      identityBaseUrl: 'https://id.test',
    })

    expect(onWs).toHaveBeenCalledWith(multi.workspaces)
    expect(result.workspaceId).toBe('ws-b')
  })

  it('throws on expired code', async () => {
    await expect(
      loginWithDeviceCode({
        onCode: vi.fn(),
        onWorkspaceRequired: vi.fn(),
        fetch: createFetchSequence([
          { status: 200, body: ISSUANCE },
          { status: 400, body: { error: 'expired_token' } },
        ]),
        identityBaseUrl: 'https://id.test',
      }),
    ).rejects.toThrow(DeviceCodeExpiredError)
  })

  it('throws on denied', async () => {
    await expect(
      loginWithDeviceCode({
        onCode: vi.fn(),
        onWorkspaceRequired: vi.fn(),
        fetch: createFetchSequence([
          { status: 200, body: ISSUANCE },
          { status: 400, body: { error: 'access_denied' } },
        ]),
        identityBaseUrl: 'https://id.test',
      }),
    ).rejects.toThrow(DeviceCodeDeniedError)
  })

  it('cancels via AbortSignal', async () => {
    const controller = new AbortController()
    await expect(
      loginWithDeviceCode({
        onCode: () => controller.abort(),
        onWorkspaceRequired: vi.fn(),
        signal: controller.signal,
        fetch: createFetchSequence([{ status: 200, body: ISSUANCE }]),
        identityBaseUrl: 'https://id.test',
      }),
    ).rejects.toThrow(LoginCancelledError)
  })
})

// --- TokenManager ---

describe('TokenManager', () => {
  let storage: MemoryTokenStorage
  const validResult: AuthResult = {
    accessToken: makeJwt({ sub: 'e1', workspace_id: 'ws1', exp: Math.floor(Date.now() / 1000) + 600 }),
    refreshToken: 'rt_abc',
    workspaceId: 'ws1',
    expiresAt: Math.floor(Date.now() / 1000) + 600,
  }

  beforeEach(() => {
    storage = new MemoryTokenStorage()
  })

  it('stores and retrieves token', async () => {
    const mgr = new TokenManager({ storage })
    await mgr.store(validResult)
    const auth = await mgr.getAccessToken()
    expect(auth?.token).toBe(validResult.accessToken)
    expect(auth?.workspaceId).toBe('ws1')
  })

  it('returns null when empty', async () => {
    expect(await new TokenManager({ storage }).getAccessToken()).toBeNull()
  })

  it('auto-refreshes expiring tokens', async () => {
    const newToken = makeJwt({ sub: 'e1', workspace_id: 'ws1', exp: Math.floor(Date.now() / 1000) + 900 })
    const mgr = new TokenManager({
      storage,
      identityBaseUrl: 'https://id.test',
      fetch: mockFetch(200, {
        access_token: newToken,
        token_type: 'Bearer',
        expires_in: 900,
        scope: 'ws:read',
        refresh_token: 'rt_new',
      }),
    })
    await mgr.store({ ...validResult, expiresAt: Math.floor(Date.now() / 1000) + 30 })
    const auth = await mgr.getAccessToken()
    expect(auth?.token).toBe(newToken)
  })

  it('throws RefreshTokenExpiredError on 401', async () => {
    const mgr = new TokenManager({
      storage,
      identityBaseUrl: 'https://id.test',
      fetch: mockFetch(401, { error: 'invalid_grant' }),
    })
    await mgr.store({ ...validResult, expiresAt: Math.floor(Date.now() / 1000) + 10 })
    await expect(mgr.getAccessToken()).rejects.toThrow(RefreshTokenExpiredError)
    expect(await mgr.hasCredentials()).toBe(false)
  })

  it('clears credentials', async () => {
    const mgr = new TokenManager({ storage })
    await mgr.store(validResult)
    await mgr.clear()
    expect(await mgr.hasCredentials()).toBe(false)
  })
})

// --- FileTokenStorage ---

describe('FileTokenStorage', () => {
  it('returns null for missing file', async () => {
    const s = new FileTokenStorage('/tmp/nonexistent-amigo-test-' + Date.now() + '/creds.json')
    expect(await s.load()).toBeNull()
  })

  it('round-trips via temp file', async () => {
    const fs = await import('node:fs/promises')
    const os = await import('node:os')
    const path = await import('node:path')
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdk-test-'))
    const filePath = path.join(dir, 'creds.json')
    try {
      const s = new FileTokenStorage(filePath)
      const creds = { access_token: 'at', refresh_token: 'rt', workspace_id: 'ws', expires_at: 1700000000 }
      await s.save(creds)
      expect(await s.load()).toEqual(creds)
      await s.clear()
      expect(await s.load()).toBeNull()
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})

// --- MemoryTokenStorage ---

describe('MemoryTokenStorage', () => {
  it('round-trips', async () => {
    const s = new MemoryTokenStorage()
    expect(await s.load()).toBeNull()
    const creds = { access_token: 'at', refresh_token: 'rt', workspace_id: 'ws', expires_at: 1700000000 }
    await s.save(creds)
    expect(await s.load()).toEqual(creds)
    await s.clear()
    expect(await s.load()).toBeNull()
  })
})

// --- CLI helpers ---

describe('formatDeviceCodeInstructions', () => {
  it('includes verification URI and user code', () => {
    const text = formatDeviceCodeInstructions(ISSUANCE)
    expect(text).toContain(ISSUANCE.verification_uri)
    expect(text).toContain(ISSUANCE.user_code)
    expect(text).toContain('15 minutes')
  })
})

describe('formatWorkspaceList', () => {
  it('formats numbered list', () => {
    const text = formatWorkspaceList([
      { workspace_id: 'ws-1', name: 'Org One', role: 'admin' },
      { workspace_id: 'ws-2', name: 'Org Two' },
    ])
    expect(text).toContain('1. Org One (admin)')
    expect(text).toContain('2. Org Two')
    expect(text).toContain('ws-1')
  })
})
