import type { components } from '../generated/api.js'
import type { PhoneNumberId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

/**
 * Manage phone numbers — provision, configure, and release Twilio numbers
 * that are attached to agents for inbound/outbound calling.
 */
export class PhoneNumbersResource extends WorkspaceScopedResource {
  /** Create a new phone number */
  async provision(body: components['schemas']['CreatePhoneNumberRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/phone-numbers', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** List phone numbers in the workspace */
  async list(params?: ListParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/phone-numbers', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  /** Get a phone number */
  async get(phoneNumberId: PhoneNumberId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/phone-numbers/{phone_number_id}', {
        params: { path: { workspace_id: this.workspaceId, phone_number_id: phoneNumberId } },
      }),
    )
  }

  /** Update a phone number (assign to agent, rename) */
  async update(
    phoneNumberId: PhoneNumberId | string,
    body: components['schemas']['UpdatePhoneNumberRequest'],
  ) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/phone-numbers/{phone_number_id}', {
        params: { path: { workspace_id: this.workspaceId, phone_number_id: phoneNumberId } },
        body,
      }),
    )
  }

  /** Release a phone number back to the carrier */
  async release(phoneNumberId: PhoneNumberId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/phone-numbers/{phone_number_id}', {
      params: { path: { workspace_id: this.workspaceId, phone_number_id: phoneNumberId } },
    })
  }

  /** Set call forwarding for a phone number */
  async setForwarding(
    phoneNumberId: PhoneNumberId | string,
    body: components['schemas']['ForwardingConfigRequest'],
  ) {
    return extractData(
      await this.client.PUT('/v1/{workspace_id}/phone-numbers/{phone_number_id}/forwarding', {
        params: { path: { workspace_id: this.workspaceId, phone_number_id: phoneNumberId } },
        body,
      }),
    )
  }

  /** Clear call forwarding for a phone number */
  async clearForwarding(phoneNumberId: PhoneNumberId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/phone-numbers/{phone_number_id}/forwarding', {
      params: { path: { workspace_id: this.workspaceId, phone_number_id: phoneNumberId } },
    })
  }
}
