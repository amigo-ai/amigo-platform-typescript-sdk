import type {
  Persona,
  CreatePersonaRequest,
  UpdatePersonaRequest,
  PaginatedResponse,
} from '../types/api.js'
import type { PersonaId } from '../core/branded-types.js'
import { WorkspaceScopedResource, buildQuery } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListPersonasParams extends ListParams {
  search?: string
}

/**
 * Manage personas — voice and personality configurations for agents.
 * A persona defines how an agent presents itself: its name, voice, and system prompt.
 */
export class PersonasResource extends WorkspaceScopedResource {
  async create(body: CreatePersonaRequest): Promise<Persona> {
    return this.fetch<Persona>('/personas', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async list(params?: ListPersonasParams): Promise<PaginatedResponse<Persona>> {
    return this.fetch<PaginatedResponse<Persona>>(`/personas${buildQuery(params)}`)
  }

  async get(personaId: PersonaId | string): Promise<Persona> {
    return this.fetch<Persona>(`/personas/${personaId}`)
  }

  async update(personaId: PersonaId | string, body: UpdatePersonaRequest): Promise<Persona> {
    return this.fetch<Persona>(`/personas/${personaId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete(personaId: PersonaId | string): Promise<void> {
    return this.fetch<void>(`/personas/${personaId}`, { method: 'DELETE' })
  }
}
