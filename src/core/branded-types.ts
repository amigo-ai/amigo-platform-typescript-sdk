/**
 * Branded types provide compile-time type safety for string IDs.
 * At runtime they are plain strings, but the type system prevents mixing them.
 */
declare const brand: unique symbol

type Brand<T, B> = T & { readonly [brand]: B }

// --- ID types ---
export type WorkspaceId = Brand<string, 'WorkspaceId'>
export type ApiKeyId = Brand<string, 'ApiKeyId'>
export type AgentId = Brand<string, 'AgentId'>
export type PersonaId = Brand<string, 'PersonaId'>
export type SkillId = Brand<string, 'SkillId'>
/** @deprecated Use ActionId instead */
export type ActionId = Brand<string, 'ActionId'>
export type ServiceId = Brand<string, 'ServiceId'>
export type ContextGraphId = Brand<string, 'ContextGraphId'>
export type CallId = Brand<string, 'CallId'>
export type PhoneNumberId = Brand<string, 'PhoneNumberId'>
export type IntegrationId = Brand<string, 'IntegrationId'>
export type EntityId = Brand<string, 'EntityId'>
export type EventId = Brand<string, 'EventId'>
export type SurfaceId = Brand<string, 'SurfaceId'>
export type OperatorId = Brand<string, 'OperatorId'>
export type TriggerId = Brand<string, 'TriggerId'>
export type SimulationRunId = Brand<string, 'SimulationRunId'>
export type SimulationSessionId = Brand<string, 'SimulationSessionId'>
export type ScribeSessionId = Brand<string, 'ScribeSessionId'>
export type FunctionId = Brand<string, 'FunctionId'>
export type DataSourceId = Brand<string, 'DataSourceId'>

// --- Constructors ---
export const workspaceId = (id: string): WorkspaceId => id as WorkspaceId
export const apiKeyId = (id: string): ApiKeyId => id as ApiKeyId
export const agentId = (id: string): AgentId => id as AgentId
export const personaId = (id: string): PersonaId => id as PersonaId
export const skillId = (id: string): SkillId => id as SkillId
export const actionId = (id: string): ActionId => id as ActionId
export const serviceId = (id: string): ServiceId => id as ServiceId
export const contextGraphId = (id: string): ContextGraphId => id as ContextGraphId
export const callId = (id: string): CallId => id as CallId
export const phoneNumberId = (id: string): PhoneNumberId => id as PhoneNumberId
export const integrationId = (id: string): IntegrationId => id as IntegrationId
export const entityId = (id: string): EntityId => id as EntityId
export const eventId = (id: string): EventId => id as EventId
export const surfaceId = (id: string): SurfaceId => id as SurfaceId
export const operatorId = (id: string): OperatorId => id as OperatorId
export const triggerId = (id: string): TriggerId => id as TriggerId
export const simulationRunId = (id: string): SimulationRunId => id as SimulationRunId
export const simulationSessionId = (id: string): SimulationSessionId => id as SimulationSessionId
export const scribeSessionId = (id: string): ScribeSessionId => id as ScribeSessionId
export const functionId = (id: string): FunctionId => id as FunctionId
export const dataSourceId = (id: string): DataSourceId => id as DataSourceId
