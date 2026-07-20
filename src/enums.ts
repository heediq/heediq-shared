import { z } from 'zod'

export const TierSchema = z.enum(['free', 'paid'])
export type Tier = z.infer<typeof TierSchema>

export const WhisperModelSchema = z.enum(['small', 'large-v3'])
export type WhisperModel = z.infer<typeof WhisperModelSchema>

export const JobStatusSchema = z.enum([
  'queued',
  'starting',
  'transcribing',
  'diarizing',
  'summarizing',
  'done',
  'failed',
  'retrying',
])
export type JobStatus = z.infer<typeof JobStatusSchema>

export const SourceStatusSchema = z.enum([
  'uploading',
  'processing',
  'ready',
  'failed',
])
export type SourceStatus = z.infer<typeof SourceStatusSchema>

export const OrgRoleSchema = z.enum(['admin', 'member'])
export type OrgRole = z.infer<typeof OrgRoleSchema>

export const SourceTypeSchema = z.enum(['audio', 'text'])
export type SourceType = z.infer<typeof SourceTypeSchema>

// ── Context Library (D-124–D-140) ──────────────────────────────────────────────

// Predefined, behaviour-bearing Domain type (D-127/D-131). Each value carries a profile in
// `domains.ts` (extraction shape + starter-prompt shortcuts). `other` is the catch-all filed when
// domain-fit confidence is low (D-130). Not user-editable at MVP; adding one is a code change.
export const DomainSchema = z.enum(['work', 'study', 'personal', 'other'])
export type Domain = z.infer<typeof DomainSchema>

// A Context's lifecycle state (D-129/D-134).
export const ContextStatusSchema = z.enum(['active', 'archived'])
export type ContextStatus = z.infer<typeof ContextStatusSchema>

// Source review-gate axis (D-133) — deliberately separate from `SourceStatus`. `pending_review`
// once analysis has produced a `proposedClassification`; `approved` once the user files it.
export const SourceClassificationSchema = z.enum(['pending_review', 'approved'])
export type SourceClassification = z.infer<typeof SourceClassificationSchema>

// Per-item curation state in the review wizard (D-135). Only `kept` items become Context memory.
export const ExtractedItemStatusSchema = z.enum(['proposed', 'kept', 'discarded'])
export type ExtractedItemStatus = z.infer<typeof ExtractedItemStatusSchema>

// Decision Ledger entry state (D-136). `needs_review` when an auto-answer's confidence is below the
// ledger threshold; `open` when a decision has no supporting data yet.
export const LedgerEntryStatusSchema = z.enum(['confirmed', 'needs_review', 'open'])
export type LedgerEntryStatus = z.infer<typeof LedgerEntryStatusSchema>

// How a Decision Ledger entry came to exist (D-136).
export const LedgerEntryOriginSchema = z.enum(['auto', 'user', 'chat_prompted'])
export type LedgerEntryOrigin = z.infer<typeof LedgerEntryOriginSchema>
