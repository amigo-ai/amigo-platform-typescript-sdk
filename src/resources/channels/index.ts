/**
 * Channels namespace — workspace-scoped CRUD over the channel-manager-backed
 * proxy mounted at ``/v1/{workspace_id}/channels/...`` on platform-api.
 *
 * Each subresource (``sesSetup``, future ``twilioSetup``, ``email``, etc.)
 * lands in its own module; this barrel composes them onto a single
 * ``ChannelsResource`` so callers can write
 * ``client.channels.sesSetup.create(...)``.
 *
 * Extends ``WorkspaceScopedResource`` so ``client.channels.withOptions(...)``
 * matches the universal pattern documented in api.md. The inherited
 * ``withOptions`` reconstructs ``ChannelsResource`` with a scoped
 * ``PlatformFetch`` client; the constructor below forwards that scoped
 * client into a fresh ``SesSetupResource``, so the scoped headers /
 * timeout / retry flow through to subresource calls automatically.
 */

import type { PlatformFetch } from '../../core/openapi-client.js'
import { WorkspaceScopedResource } from '../base.js'
import { SesSetupResource } from './ses-setup.js'

export { SesSetupResource } from './ses-setup.js'
export type {
  CreateSesSetupRequest,
  DnsRecord,
  SesSetupDetail,
  SesSetupListItem,
  SesSetupListResponse,
} from './ses-setup.js'

export class ChannelsResource extends WorkspaceScopedResource {
  readonly sesSetup: SesSetupResource

  constructor(client: PlatformFetch, workspaceId: string) {
    super(client, workspaceId)
    this.sesSetup = new SesSetupResource(client, workspaceId)
  }
}
