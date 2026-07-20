import { type Domain } from './enums.js'

// ── Domain behaviour profiles (D-127/D-131) ────────────────────────────────────
//
// A Domain is not a bare label but a behaviour profile: it tells the ingest pipeline *what shape to
// extract* and *what outputs make sense*. Profiles live here as a versioned constant (parallel to
// the permission catalog in `permissions.ts`), NOT as per-org DynamoDB rows — adding or adjusting a
// profile is a code change, not a schema migration (D-127).
//
// Both `extractionFields` and `starterPrompts` are **stable slug IDs, never display text.** This
// package is consumed by `heediq-web`, where D-075/D-076 forbid literal user-facing English in code
// — so the web layer maps each slug to a `t()` translation key for its label, and the chat step
// maps a `starterPrompts` slug to an actual Claude prompt template. `extractionFields` slugs double
// as the allowed `ExtractedItem.category` values for a Context filed in this Domain (D-135); the
// summarization worker validates an item's category against its Context's Domain profile at write
// time (a runtime check — the schema can't enforce it because an item doesn't carry its Domain).

export interface DomainProfile {
  /** Category slugs the summarizer extracts for this Domain; also the valid `ExtractedItem.category` set. */
  extractionFields: readonly string[]
  /** Chat starter-prompt shortcut slugs (D-126). Empty for `other`. */
  starterPrompts: readonly string[]
}

export const DOMAIN_PROFILES: Record<Domain, DomainProfile> = {
  work: {
    extractionFields: ['requirements', 'decisions', 'openQuestions', 'actionItems'],
    starterPrompts: ['technicalRequirements', 'testPlan', 'stakeholderSlides', 'risksOpenQuestions'],
  },
  study: {
    extractionFields: ['keyConcepts', 'definitions', 'questions', 'references', 'actionItems'],
    starterPrompts: ['studyGuide', 'flashcards', 'practiceQuiz', 'keyConceptsSummary'],
  },
  personal: {
    extractionFields: ['items', 'amounts', 'dates', 'notes'],
    starterPrompts: ['shoppingList', 'spendingSummary', 'upcomingDates', 'checklist'],
  },
  other: {
    // Catch-all for low domain-fit confidence (D-130); generic extraction, no specialized prompts.
    extractionFields: ['keyPoints', 'actionItems', 'notes'],
    starterPrompts: [],
  },
}

// Domain-fit confidence below this files the Source to the `other` Domain instead of a low-confidence
// guess (D-130). Distinct from the ledger threshold in `context.ts`. Tunable — one place to change it.
export const DOMAIN_FIT_CONFIDENCE_THRESHOLD = 0.75
