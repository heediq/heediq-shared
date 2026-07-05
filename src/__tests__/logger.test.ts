import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLogger } from '../logger.js'

function parseLastLog(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1)
  return JSON.parse(call?.[0] as string)
}

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits a structured JSON line with service, level, message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    createLogger('heediq-api').info('hello')
    const line = parseLastLog(spy)
    expect(line).toMatchObject({ service: 'heediq-api', level: 'info', message: 'hello' })
    expect(typeof line.timestamp).toBe('string')
  })

  it('includes correlationId fields when passed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    createLogger('heediq-api').info('job started', { sourceId: 'src-1', requestId: 'req-1' })
    const line = parseLastLog(spy)
    expect(line).toMatchObject({ sourceId: 'src-1', requestId: 'req-1' })
  })

  it('routes warn/error to console.warn/console.error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createLogger('heediq-api')
    logger.warn('careful')
    logger.error('broken')
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('redacts denylisted keys (transcript, email, password, token, secret, authorization)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    createLogger('heediq-worker-summarization').info('done', {
      transcript: 'sensitive meeting content',
      email: 'user@example.com',
      password: 'hunter2',
      token: 'abc.def.ghi',
      secret: 'shh',
      authorization: 'Bearer xyz',
    })
    const line = parseLastLog(spy)
    expect(line.transcript).toBe('[REDACTED]')
    expect(line.email).toBe('[REDACTED]')
    expect(line.password).toBe('[REDACTED]')
    expect(line.token).toBe('[REDACTED]')
    expect(line.secret).toBe('[REDACTED]')
    expect(line.authorization).toBe('[REDACTED]')
  })

  it('redacts denylisted keys nested inside objects/arrays', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    createLogger('heediq-api').info('nested', {
      job: { audioUrl: 'https://signed-url', items: [{ email: 'a@b.com' }] },
    })
    const line = parseLastLog(spy)
    const job = line.job as { audioUrl: string; items: Array<{ email: string }> }
    expect(job.audioUrl).toBe('[REDACTED]')
    expect(job.items[0].email).toBe('[REDACTED]')
  })

  it('does not redact safe metadata like ids and status', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    createLogger('heediq-api').info('status change', { sourceId: 'src-1', status: 'ready', jobId: 'job-1' })
    const line = parseLastLog(spy)
    expect(line).toMatchObject({ sourceId: 'src-1', status: 'ready', jobId: 'job-1' })
  })
})
