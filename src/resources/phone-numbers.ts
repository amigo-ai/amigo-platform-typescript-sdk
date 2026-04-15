import type {
  PhoneNumber,
  ProvisionPhoneNumberRequest,
  UpdatePhoneNumberRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { PhoneNumberId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

/**
 * Manage phone numbers — provision, configure, and release Twilio numbers
 * that are attached to agents for inbound/outbound calling.
 */
export class PhoneNumbersResource extends WorkspaceScopedResource {
  /** Provision a new phone number (area code or specific number) */
  async provision(body: ProvisionPhoneNumberRequest): Promise<PhoneNumber> {
    return this.fetch<PhoneNumber>('/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** List phone numbers in the workspace */
  async list(params?: ListParams): Promise<PaginatedResponse<PhoneNumber>> {
    return this.fetch<PaginatedResponse<PhoneNumber>>(`/phone-numbers${buildQuery(params)}`)
  }

  /** Get a phone number */
  async get(phoneNumberId: PhoneNumberId | string): Promise<PhoneNumber> {
    return this.fetch<PhoneNumber>(`/phone-numbers/${phoneNumberId}`)
  }

  /** Update a phone number (assign to agent, rename) */
  async update(phoneNumberId: PhoneNumberId | string, body: UpdatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.fetch<PhoneNumber>(`/phone-numbers/${phoneNumberId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /** Release a phone number back to the carrier */
  async release(phoneNumberId: PhoneNumberId | string): Promise<void> {
    return this.fetch<void>(`/phone-numbers/${phoneNumberId}`, { method: 'DELETE' })
  }

  /** Send a test call to a phone number to verify it's working */
  async test(phoneNumberId: PhoneNumberId | string): Promise<{ success: boolean; call_sid: string }> {
    return this.fetch<{ success: boolean; call_sid: string }>(
      `/phone-numbers/${phoneNumberId}/test`,
      { method: 'POST' },
    )
  }
}
