import { z } from 'zod'
import { JobStatusSchema } from './enums.js'

// Payload for the job_status event (D-061, generalized by D-109) — pushed at org scope so every
// connected user in the source's org sees library-wide status updates, not just the uploader.
const JobStatusPayloadSchema = z.object({
  jobId: z.string().uuid(),
  sourceId: z.string().uuid(),
  status: JobStatusSchema,
})

// One entry per event type this WS framework carries. Adding an event type is additive — future
// features extend this map instead of growing a single ad-hoc message shape (D-109).
export interface WsEventPayloadMap {
  job_status: z.infer<typeof JobStatusPayloadSchema>
}
export type WsEventType = keyof WsEventPayloadMap

// Connections are addressed by exactly one of these three scopes (D-109) — the retired by-source
// GSI's per-resource scope is gone, so every feature reuses the same three fan-out shapes.
export const WsScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.string() }),
  z.object({ kind: z.literal('org'), orgId: z.string().uuid() }),
  z.object({ kind: z.literal('broadcast') }),
])
export type WsScope = z.infer<typeof WsScopeSchema>

// Common envelope shared by every WS push, regardless of event type. Discriminated on `type` so
// `payload` is typed per variant instead of `unknown`, mirroring AuditLogEntrySchema's approach
// (audit.ts) for the same reason: one shared shape, resource/event-specific payload.
const wsEnvelope = {
  scope: WsScopeSchema,
  occurredAt: z.string().datetime(),
}

export const WsEventEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({ ...wsEnvelope, type: z.literal('job_status'), payload: JobStatusPayloadSchema }),
])
export type WsEventEnvelope = z.infer<typeof WsEventEnvelopeSchema>

// Pure builder — constructs and validates an envelope (fills occurredAt), but never pushes it.
// heediq-shared carries zero AWS SDK dependencies (schema/logic only); the actual
// PostToConnection call lives in heediq-api's `src/lib/wsPush.ts` (D-109).
export interface BuildWsEventInput<T extends WsEventType> {
  scope: WsScope
  type: T
  payload: WsEventPayloadMap[T]
}

export function buildWsEvent<T extends WsEventType>(input: BuildWsEventInput<T>): WsEventEnvelope {
  return WsEventEnvelopeSchema.parse({
    scope: input.scope,
    occurredAt: new Date().toISOString(),
    type: input.type,
    payload: input.payload,
  })
}
