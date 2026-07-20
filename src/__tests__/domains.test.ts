import { describe, it, expect } from 'vitest'
import { DomainSchema } from '../enums.js'
import { DOMAIN_PROFILES, DOMAIN_FIT_CONFIDENCE_THRESHOLD } from '../domains.js'

describe('DOMAIN_PROFILES (D-127/D-131)', () => {
  it('has a profile for every Domain enum value', () => {
    for (const domain of DomainSchema.options) {
      expect(DOMAIN_PROFILES[domain]).toBeDefined()
    }
  })

  it('gives every Domain a non-empty extractionFields set', () => {
    for (const domain of DomainSchema.options) {
      expect(DOMAIN_PROFILES[domain].extractionFields.length).toBeGreaterThan(0)
    }
  })

  it('leaves the `other` catch-all with no specialized starter prompts (D-131)', () => {
    expect(DOMAIN_PROFILES.other.starterPrompts).toEqual([])
  })

  it('gives the specialized domains starter prompts', () => {
    expect(DOMAIN_PROFILES.work.starterPrompts.length).toBeGreaterThan(0)
    expect(DOMAIN_PROFILES.study.starterPrompts.length).toBeGreaterThan(0)
    expect(DOMAIN_PROFILES.personal.starterPrompts.length).toBeGreaterThan(0)
  })

  it('carries the D-131 work extraction shape (today’s summarizer behavior)', () => {
    expect(DOMAIN_PROFILES.work.extractionFields).toEqual([
      'requirements',
      'decisions',
      'openQuestions',
      'actionItems',
    ])
  })
})

describe('DOMAIN_FIT_CONFIDENCE_THRESHOLD (D-130)', () => {
  it('is 0.75, within [0,1]', () => {
    expect(DOMAIN_FIT_CONFIDENCE_THRESHOLD).toBe(0.75)
    expect(DOMAIN_FIT_CONFIDENCE_THRESHOLD).toBeGreaterThanOrEqual(0)
    expect(DOMAIN_FIT_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1)
  })
})
