// Structured logger for D-085 (native AWS CloudWatch + X-Ray observability, no separate tool).
// One shared JSON shape across every Node service so CloudWatch Logs Insights can query
// consistently; correlation is by `sourceId` (already threaded through every SQS message/table,
// D-068) once one exists, otherwise a caller-supplied `requestId`.
//
// Redaction is enforced here, not left to convention: 07-engineering-standards.md §2 forbids
// logging PII (transcript text, emails, secrets), so any denylisted key is stripped before the
// line is ever written rather than trusted to call sites.

const REDACTED = '[REDACTED]'

// Matched case-insensitively against object keys at any depth.
const DENYLIST = [
  'transcript',
  'email',
  'audiourl',
  'password',
  'token',
  'secret',
  'authorization',
] as const

type LogLevel = 'info' | 'warn' | 'error'

export interface LogMeta {
  sourceId?: string
  requestId?: string
  [key: string]: unknown
}

export interface StructuredLogger {
  info: (message: string, meta?: LogMeta) => void
  warn: (message: string, meta?: LogMeta) => void
  error: (message: string, meta?: LogMeta) => void
}

function isDenylisted(key: string): boolean {
  const lower = key.toLowerCase()
  return DENYLIST.some((denied) => lower.includes(denied))
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isDenylisted(key) ? REDACTED : redact(val)
    }
    return out
  }
  return value
}

function write(service: string, level: LogLevel, message: string, meta?: LogMeta): void {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(meta ? (redact(meta) as object) : {}),
  }
  // eslint-disable-next-line no-console
  console[level === 'info' ? 'log' : level](JSON.stringify(line))
}

export function createLogger(service: string): StructuredLogger {
  return {
    info: (message, meta) => write(service, 'info', message, meta),
    warn: (message, meta) => write(service, 'warn', message, meta),
    error: (message, meta) => write(service, 'error', message, meta),
  }
}
