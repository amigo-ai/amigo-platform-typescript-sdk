import type { components, paths } from '../generated/api.js'
import { WorkspaceScopedResource, extractData } from './base.js'

type Q<P extends keyof paths> = NonNullable<
  paths[P] extends { get: { parameters: { query?: infer Query } } } ? Query : never
>

export type PatientSearchParams = Q<'/v1/{workspace_id}/fhir/patients'>
/** Spec-defined query params for `/fhir/resources/{resource_type}` (FHIR-style search). */
export type FhirSearchParams = Q<'/v1/{workspace_id}/fhir/resources/{resource_type}'>
/** Per-view query params; each typed view shares the same generated query shape. */
export type FhirViewParams = Q<'/v1/{workspace_id}/fhir/views/patients'>
export type SyncFailuresParams = Q<'/v1/{workspace_id}/fhir/sync-failures'>

/**
 * FHIR — healthcare data interop surface for connected EHR integrations.
 *
 * @beta New in this release; surface may evolve as the EHR adapters stabilize.
 *
 * Provides:
 *   - Sync status + failure visibility (`status`, `syncFailures`)
 *   - Bulk imports (`import`)
 *   - FHIR-shaped CRUD on resources (`resources.*`)
 *   - Patient-centric views (`patients`, `patientSummary`, `patientTimeline`)
 *   - Pre-aggregated typed views per resource type (`views.*`)
 *
 * All operations are workspace-scoped; the FHIR server identity is determined
 * by the workspace's connected EHR integration.
 */
export class FhirResource extends WorkspaceScopedResource {
  /** Get current FHIR sync status (server identity, last sync, counts) */
  async getStatus() {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fhir/status', {
        params: { path: { workspace_id: this.workspaceId } },
      }),
    )
  }

  /** List recent FHIR sync failures (for triage) */
  async getSyncFailures(params?: SyncFailuresParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fhir/sync-failures', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Trigger a FHIR import (full or partial, depending on request) */
  async import(body: components['schemas']['FhirImportRequest']) {
    return extractData(
      await this.client.POST('/v1/{workspace_id}/fhir/import', {
        params: { path: { workspace_id: this.workspaceId } },
        body,
      }),
    )
  }

  /** Search patients by demographics or identifiers */
  async searchPatients(params?: PatientSearchParams) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fhir/patients', {
        params: { path: { workspace_id: this.workspaceId }, query: params },
      }),
    )
  }

  /** Get a patient summary (canonical demographics + active conditions/meds) */
  async getPatientSummary(patientId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fhir/patients/{patient_id}/summary', {
        params: { path: { workspace_id: this.workspaceId, patient_id: patientId } },
      }),
    )
  }

  /** Get a patient's longitudinal clinical timeline */
  async getPatientTimeline(patientId: string) {
    return extractData(
      await this.client.GET('/v1/{workspace_id}/fhir/patients/{patient_id}/timeline', {
        params: { path: { workspace_id: this.workspaceId, patient_id: patientId } },
      }),
    )
  }

  readonly resources = {
    /** Search FHIR resources of a given type (passes search params through to FHIR) */
    search: async (resourceType: string, params?: FhirSearchParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/resources/{resource_type}', {
          params: {
            path: { workspace_id: this.workspaceId, resource_type: resourceType },
            query: params,
          },
        }),
      ),

    /** Create a FHIR resource of the given type */
    create: async (resourceType: string, body: components['schemas']['FhirWriteRequest']) =>
      extractData(
        await this.client.POST('/v1/{workspace_id}/fhir/resources/{resource_type}', {
          params: { path: { workspace_id: this.workspaceId, resource_type: resourceType } },
          body,
        }),
      ),

    /** Get a single FHIR resource by type + id */
    get: async (resourceType: string, resourceId: string) =>
      extractData(
        await this.client.GET(
          '/v1/{workspace_id}/fhir/resources/{resource_type}/{resource_id}',
          {
            params: {
              path: {
                workspace_id: this.workspaceId,
                resource_type: resourceType,
                resource_id: resourceId,
              },
            },
          },
        ),
      ),

    /** Update a FHIR resource by type + id */
    update: async (
      resourceType: string,
      resourceId: string,
      body: components['schemas']['FhirWriteRequest'],
    ) =>
      extractData(
        await this.client.PUT(
          '/v1/{workspace_id}/fhir/resources/{resource_type}/{resource_id}',
          {
            params: {
              path: {
                workspace_id: this.workspaceId,
                resource_type: resourceType,
                resource_id: resourceId,
              },
            },
            body,
          },
        ),
      ),

    /** Get the version history for a FHIR resource */
    getHistory: async (resourceType: string, resourceId: string) =>
      extractData(
        await this.client.GET(
          '/v1/{workspace_id}/fhir/resources/{resource_type}/{resource_id}/history',
          {
            params: {
              path: {
                workspace_id: this.workspaceId,
                resource_type: resourceType,
                resource_id: resourceId,
              },
            },
          },
        ),
      ),
  }

  readonly views = {
    /** List patients (typed view with computed display fields) */
    patients: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/patients', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** List appointments */
    appointments: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/appointments', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** List practitioners */
    practitioners: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/practitioners', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** List organizations */
    organizations: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/organizations', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** List locations */
    locations: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/locations', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),

    /** List schedule slots */
    slots: async (params?: FhirViewParams) =>
      extractData(
        await this.client.GET('/v1/{workspace_id}/fhir/views/slots', {
          params: { path: { workspace_id: this.workspaceId }, query: params },
        }),
      ),
  }
}
