/**
 * Channels namespace — workspace-scoped CRUD over the channel-manager-backed
 * proxy mounted at ``/v1/{workspace_id}/channels/...`` on platform-api.
 *
 * Each subresource (``sesSetup``, future ``twilioSetup``, ``email``, etc.)
 * lands in its own module; this barrel composes them onto a single
 * ``ChannelsResource`` so callers can write
 * ``client.channels.sesSetup.create(...)``.
 */

import type { PlatformFetch } from '../../core/openapi-client.js'
import { SesSetupResource } from './ses-setup.js'

export { SesSetupResource } from './ses-setup.js'
export type {
  CreateSesSetupRequest,
  DnsRecord,
  SesSetupDetail,
  SesSetupListItem,
} from './ses-setup.js'

export class ChannelsResource {
  readonly sesSetup: SesSetupResource

  constructor(client: PlatformFetch, workspaceId: string) {
    this.sesSetup = new SesSetupResource(client, workspaceId)
  }
}
