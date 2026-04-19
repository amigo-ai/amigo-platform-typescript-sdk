import type { components } from '../generated/api.js'
import type { PersonaId } from '../core/branded-types.js'
import { WorkspaceScopedResource, extractData } from './base.js'
import type { ListParams } from '../core/utils.js'

export interface ListPersonasParams extends ListParams {
  search?: string | null
  sort_by?: string | null
}

export class PersonasResource extends WorkspaceScopedResource {
  async list(params?: ListPersonasParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/personas', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  listAutoPaging(params?: ListPersonasParams) {
    return this.iteratePaginatedList((pageParams) => this.list(pageParams), params)
  }

  async create(body: components['schemas']['CreatePersonaRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/personas', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  async get(personaId: PersonaId | string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/personas/{persona_id}', {
        params: { path: { workspace_id: this.workspaceId, persona_id: personaId } },
      }),
    )
  }

  async update(
    personaId: PersonaId | string,
    body: components['schemas']['UpdatePersonaRequest'],
  ) {
    return extractData(
      await this.client.PATCH('/v1/{workspace_id}/personas/{persona_id}', {
        params: { path: { workspace_id: this.workspaceId, persona_id: personaId } },
        body,
      }),
    )
  }

  async delete(personaId: PersonaId | string): Promise<void> {
    await this.client.DELETE('/v1/{workspace_id}/personas/{persona_id}', {
      params: { path: { workspace_id: this.workspaceId, persona_id: personaId } },
    })
  }
}
