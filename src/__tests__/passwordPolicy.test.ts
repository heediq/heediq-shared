import { describe, it, expect } from 'vitest'
import { PASSWORD_POLICY_RULES, isPasswordPolicyCompliant } from '../passwordPolicy.js'

function ruleResults(password: string): Record<string, boolean> {
  return Object.fromEntries(PASSWORD_POLICY_RULES.map((rule) => [rule.id, rule.test(password)]))
}

describe('PASSWORD_POLICY_RULES', () => {
  it('flags every rule as unmet for an empty password', () => {
    expect(ruleResults('')).toEqual({
      minLength: false,
      uppercase: false,
      lowercase: false,
      digit: false,
      symbol: false,
    })
  })

  it('evaluates each rule independently', () => {
    expect(ruleResults('alllowercase')).toMatchObject({ minLength: true, uppercase: false, lowercase: true, digit: false, symbol: false })
    expect(ruleResults('ALLUPPERCASE')).toMatchObject({ uppercase: true, lowercase: false })
    expect(ruleResults('short1!')).toMatchObject({ minLength: false, digit: true, symbol: true })
  })

  it('meets minLength at exactly 8 characters, not 7', () => {
    expect(ruleResults('Ab1!567').minLength).toBe(false) // 7 chars
    expect(ruleResults('Ab1!5678').minLength).toBe(true) // 8 chars
  })
})

describe('isPasswordPolicyCompliant', () => {
  it('is false when any rule is unmet', () => {
    expect(isPasswordPolicyCompliant('password')).toBe(false) // no upper/digit/symbol
    expect(isPasswordPolicyCompliant('Password1')).toBe(false) // no symbol
  })

  it('is true only when every rule is met', () => {
    expect(isPasswordPolicyCompliant('Password1!')).toBe(true)
  })
})
