import { z } from 'zod'
import {
  DomainSchema,
  ContextStatusSchema,
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
export const ContextSchema = z.object({
  contextId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string(),
  domain: DomainSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  // Self-nesting (D-134); absent = a top-level Context.
  parentContextId: z.string().uuid().optional(),
  status: ContextStatusSchema.default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Context = z.infer<typeof ContextSchema>

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
