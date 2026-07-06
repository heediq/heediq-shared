/**
 * Single source of truth for Heediq's password rules (D-020's Cognito passwordPolicy),
 * shared by heediq-api (server-side messaging) and heediq-web (live UI checklist). The
 * Cognito User Pool config in heediq-infra/lib/foundation/foundation-stack.ts is a separate
 * literal — heediq-infra has no runtime dependency on this package — kept in sync by the
 * periodic consistency-check (claude-workspace/rules/10-consistency-check.md), not by import.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigits: true,
  requireSymbols: true,
} as const

export interface PasswordPolicyRule {
  id: 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'symbol'
  test: (password: string) => boolean
}

export const PASSWORD_POLICY_RULES: readonly PasswordPolicyRule[] = [
  { id: 'minLength', test: (password) => password.length >= PASSWORD_POLICY.minLength },
  { id: 'uppercase', test: (password) => /[A-Z]/.test(password) },
  { id: 'lowercase', test: (password) => /[a-z]/.test(password) },
  { id: 'digit', test: (password) => /[0-9]/.test(password) },
  { id: 'symbol', test: (password) => /[^A-Za-z0-9]/.test(password) },
]

export function isPasswordPolicyCompliant(password: string): boolean {
  return PASSWORD_POLICY_RULES.every((rule) => rule.test(password))
}
