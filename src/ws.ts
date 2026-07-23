import { z } from 'zod'
import { JobStatusSchema } from './enums.js'
import { ProposedClassificationSchema } from './context.js'

// Payload for the job_status event (D-061, generalized by D-109) — pushed at org scope so every
// connected user in the source's org sees library-wide status updates, not just the uploader.
const JobStatusPayloadSchema = z.object({
  jobId: z.string().uuid(),
  sourceId: z.string().uuid(),
  status: JobStatusSchema,
})

// ── Context Library WS events (additive per D-109) ─────────────────────────────

// The ingest classifier's proposal, pushed so the review card renders live without polling (D-133).
// Reuses `ProposedClassificationSchema` (the same shape persisted on the Source) plus the sourceId.
// Typically pushed at org scope, like job_status.
const ClassificationReadyPayloadSchema = ProposedClassificationSchema.and(
  z.object({ sourceId: z.string().uuid() }),
)

// A batched chunk of a streaming chat turn (D-139) — pushed at user scope (private to the chatter),
// ~100ms cadence. `delta` is the new text since the last chunk.
const ChatDeltaPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().min(1),
  delta: z.string(),
})

// Finalizes a streamed chat turn (D-139) — the assistant message is now persisted.
const ChatCompletePayloadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().min(1),
})

// A chat turn failed after retries were exhausted (D-145) — pushed at user scope so the frontend
// has something to react to instead of an indefinite spinner (D-111). `messageId` is the assistant
// message id the worker had allocated for this turn (never persisted, since the turn failed).
const ChatFailedPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().min(1),
  error: z.string(),
})

// The review-time ledger reconciliation pass finished (D-148) — the Context's Decision Ledger has
// been (re)generated for this source, so the review wizard's step 3 can fetch and render it. Pushed
// at user scope (private to the reviewer). `entryCount` is the total ledger size after reconciliation
// (a lightweight signal; the wizard re-fetches the entries via `GET /contexts/:id/ledger`).
const LedgerReadyPayloadSchema = z.object({
  contextId: z.string().uuid(),
  sourceId: z.string().uuid(),
  entryCount: z.number().int().min(0),
})

// One entry per event type this WS framework carries. Adding an event type is additive — future
// features extend this map instead of growing a single ad-hoc message shape (D-109).
export interface WsEventPayloadMap {
  job_status: z.infer<typeof JobStatusPayloadSchema>
  classification_ready: z.infer<typeof ClassificationReadyPayloadSchema>
  chat_delta: z.infer<typeof ChatDeltaPayloadSchema>
  chat_complete: z.infer<typeof ChatCompletePayloadSchema>
  chat_failed: z.infer<typeof ChatFailedPayloadSchema>
  ledger_ready: z.infer<typeof LedgerReadyPayloadSchema>
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
  z.object({
    ...wsEnvelope,
    type: z.literal('classification_ready'),
    payload: ClassificationReadyPayloadSchema,
  }),
  z.object({ ...wsEnvelope, type: z.literal('chat_delta'), payload: ChatDeltaPayloadSchema }),
  z.object({ ...wsEnvelope, type: z.literal('chat_complete'), payload: ChatCompletePayloadSchema }),
  z.object({ ...wsEnvelope, type: z.literal('chat_failed'), payload: ChatFailedPayloadSchema }),
  z.object({ ...wsEnvelope, type: z.literal('ledger_ready'), payload: LedgerReadyPayloadSchema }),
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
