import { z } from 'zod'
import {
  DomainSchema,
  ContextStatusSchema,
  ContextVisibilitySchema,
  ContextGrantAccessSchema,
  ExtractedItemStatusSchema,
  LedgerEntryStatusSchema,
  LedgerEntryOriginSchema,
} from './enums.js'

// ── Context Library data model (D-124–D-140) ───────────────────────────────────
//
// See `plans/context-library-spec.md` (§4) for the full data model. Table/GSI creation for these
// entities is the infra step (§11 step 2), not this contracts package — DynamoDB is schemaless for
// non-key attributes, so these schemas define the item shapes the infra step will build tables for.

// The ingest classifier's proposal for where a Source belongs (D-130/D-133). Persisted on the Source
// as `proposedClassification` (cleared on approval) and carried in the `classification_ready` WS
// event. Exactly one of `proposedContextId` (file into an existing Context) or `newContextName`
// (propose creating one) is set.
export const ProposedClassificationSchema = z
  .object({
    proposedContextId: z.string().uuid().optional(),
    newContextName: z.string().min(1).max(255).optional(),
    domain: DomainSchema,
    labels: z.array(z.string().min(1).max(50)).max(20).default([]),
    confidence: z.number().min(0).max(1),
  })
  .refine(
    (p) => (p.proposedContextId === undefined) !== (p.newContextName === undefined),
    { message: 'Exactly one of proposedContextId or newContextName must be set' },
  )
export type ProposedClassification = z.infer<typeof ProposedClassificationSchema>

// A Context — the user's actual project/activity, belonging to one Domain, self-nesting into
// sub-Contexts (project → epic → story) via `parentContextId` (D-129/D-134). Renamed from D-068's
// "Container". Accumulates Sources.
export const ContextSchema = z
  .object({
    contextId: z.string().uuid(),
    orgId: z.string().uuid(),
    userId: z.string(),
    domain: DomainSchema,
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    // Self-nesting (D-134); absent = a top-level Context.
    parentContextId: z.string().uuid().optional(),
    // Audience tier (D-141) — the API writer materializes `scopeKey` (`U#`/`G#`/`O#`) from this for
    // the by-scope GSI. Defaults to `personal` so a Context is private unless deliberately shared.
    visibility: ContextVisibilitySchema.default('personal'),
    // The D-102 group a `group`-visibility Context is shared with — required iff visibility='group',
    // absent otherwise (enforced by the refine below).
    groupId: z.string().uuid().optional(),
    status: ContextStatusSchema.default('active'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((c) => (c.visibility === 'group') === (c.groupId !== undefined), {
    message: 'groupId must be set iff visibility is "group"',
    path: ['groupId'],
  })
export type Context = z.infer<typeof ContextSchema>

// A regulated cross-org share of a Context (D-142) — the single controlled crossing of D-021 org
// isolation. Row in `heediq-context-grants` (PK=`granteeUserId`, SK=`contextId`, GSI `by-context`,
// TTL `expiresAt`). Grants are **always time-limited** and authorized against a *live* row on every
// request (never cached into the JWT); `expiresAt` is compared in code because DDB TTL deletion lags
// (the TTL is cleanup only). Revocation = deleting the row.
export const ContextGrantSchema = z.object({
  contextId: z.string().uuid(),
  granteeUserId: z.string(),
  // The grantee's own org — for audit and so a cross-org read is attributable; may equal ownerOrgId
  // for a same-org share, but the primary use is userA@orgA → userB@orgB (D-142/D-143).
  granteeOrgId: z.string().uuid(),
  // The Context owner's org — contributed Sources/data home here, never in the grantee's org (D-142).
  ownerOrgId: z.string().uuid(),
  // The owner/admin who issued the grant (gated on `context:share`).
  grantedByUserId: z.string(),
  access: ContextGrantAccessSchema,
  // Required — grants are regulated and always expire (D-142). Epoch seconds, not ISO — this IS
  // the DynamoDB TTL attribute, and DynamoDB TTL only recognizes a Number (epoch seconds); a string
  // is silently ignored by the TTL sweep (caught in 4c-i, corrected from the original ISO typing).
  expiresAt: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type ContextGrant = z.infer<typeof ContextGrantSchema>

// One individually-addressable extracted statement with provenance and curation status (D-135,
// supersedes D-132's flat `Summary.extracted` arrays). `category` is one of the filed Domain's
// `extractionFields` (DOMAIN_PROFILES in `domains.ts`) — validated by the writer at write time, not
// here, because an item doesn't carry its own Domain (its Context does). `contextId` is set on
// review approval/placement. Only `kept` items become durable Context memory.
export const ExtractedItemSchema = z.object({
  itemId: z.string().uuid(),
  sourceId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  category: z.string().min(1).max(50),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().optional(),
  status: ExtractedItemStatusSchema.default('proposed'),
  createdAt: z.string().datetime(),
})
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>

// A per-Context Decision Ledger entry (D-136) — a curated, deduplicated context-level roll-up of key
// decisions and open questions, distinct from per-source `ExtractedItem`s. Designed into the model
// now; generation + fill-in UI + chat-time gating build as a fast-follow. `answer` is null while a
// decision is unanswered/`open`.
export const DecisionLedgerEntrySchema = z.object({
  entryId: z.string().uuid(),
  contextId: z.string().uuid(),
  topic: z.string().min(1),
  answer: z.string().nullable(),
  status: LedgerEntryStatusSchema,
  confidence: z.number().min(0).max(1),
  origin: LedgerEntryOriginSchema,
  sourceRefs: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DecisionLedgerEntry = z.infer<typeof DecisionLedgerEntrySchema>

// A ledger auto-answer below this confidence is flagged `needs_review` (D-136). Distinct from the
// ~0.75 domain-fit threshold in `domains.ts` — this gates decision quality, not classification.
export const LEDGER_REVIEW_CONFIDENCE_THRESHOLD = 0.5

// ── Context chat (D-138/D-139, §11 step 4c-ii) ──────────────────────────────────

// A named chat thread scoped to a Context (ChatGPT-style, D-138) — a durable artifact the user
// returns to, not ephemeral chat. Row in `heediq-conversations` (PK=`conversationId`,
// GSI `by-context` PK=`contextId`).
export const ConversationSchema = z.object({
  conversationId: z.string().uuid(),
  contextId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1).max(255),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Conversation = z.infer<typeof ConversationSchema>

// One turn in a Conversation. Row in `heediq-chat-messages` (PK=`conversationId`,
// SK=`sk` = `<ts>#<messageId>`, D-138) — `sk` is carried on the schema itself since it's the sort
// key the writer must construct, not derived implicitly. `model` is set on assistant messages only
// (which tier/model generated this turn, D-067); absent on user messages.
export const ChatMessageSchema = z.object({
  conversationId: z.string().uuid(),
  sk: z.string().min(1),
  messageId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  model: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>
