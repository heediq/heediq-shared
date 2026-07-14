import { describe, it, expect } from 'vitest'
import { WsScopeSchema, WsEventEnvelopeSchema, buildWsEvent } from '../ws.js'

const uuid = '00000000-0000-0000-0000-000000000001'
const now = new Date().toISOString()

describe('WsScopeSchema', () => {
  it('parses a user scope', () => {
    expect(WsScopeSchema.parse({ kind: 'user', userId: 'u1' })).toMatchObject({ kind: 'user' })
  })
  it('parses an org scope', () => {
    expect(WsScopeSchema.parse({ kind: 'org', orgId: uuid })).toMatchObject({ kind: 'org' })
  })
  it('parses a broadcast scope', () => {
    expect(WsScopeSchema.parse({ kind: 'broadcast' })).toMatchObject({ kind: 'broadcast' })
  })
  it('rejects an org scope with a non-uuid orgId', () => {
    expect(() => WsScopeSchema.parse({ kind: 'org', orgId: 'not-a-uuid' })).toThrow()
  })
  it('rejects an unknown scope kind', () => {
    expect(() => WsScopeSchema.parse({ kind: 'team', teamId: uuid })).toThrow()
  })
})

describe('WsEventEnvelopeSchema', () => {
  it('parses a job_status event at org scope', () => {
    const event = {
      scope: { kind: 'org' as const, orgId: uuid },
      occurredAt: now,
      type: 'job_status' as const,
      payload: { jobId: uuid, sourceId: uuid, status: 'transcribing' as const },
    }
    expect(WsEventEnvelopeSchema.parse(event)).toMatchObject({ type: 'job_status' })
  })

  it('rejects a job_status event carrying a mismatched payload shape', () => {
    const event = {
      scope: { kind: 'org' as const, orgId: uuid },
      occurredAt: now,
      type: 'job_status' as const,
      payload: { foo: 'bar' },
    }
    expect(() => WsEventEnvelopeSchema.parse(event)).toThrow()
  })

  it('rejects an unknown event type', () => {
    const event = {
      scope: { kind: 'broadcast' as const },
      occurredAt: now,
      type: 'unknown_event',
      payload: {},
    }
    expect(() => WsEventEnvelopeSchema.parse(event)).toThrow()
  })

  it('rejects an invalid status in the job_status payload', () => {
    const event = {
      scope: { kind: 'user' as const, userId: 'u1' },
      occurredAt: now,
      type: 'job_status' as const,
      payload: { jobId: uuid, sourceId: uuid, status: 'unknown' },
    }
    expect(() => WsEventEnvelopeSchema.parse(event)).toThrow()
  })
})

describe('buildWsEvent', () => {
  it('fills occurredAt and produces a schema-valid envelope', () => {
    const event = buildWsEvent({
      scope: { kind: 'org', orgId: uuid },
      type: 'job_status',
      payload: { jobId: uuid, sourceId: uuid, status: 'done' },
    })
    expect(event.occurredAt).toBe(new Date(event.occurredAt).toISOString())
    expect(WsEventEnvelopeSchema.parse(event)).toMatchObject({ type: 'job_status' })
  })

  it('rejects a payload shape that does not match the given event type', () => {
    expect(() =>
      buildWsEvent({
        scope: { kind: 'broadcast' },
        type: 'job_status',
        // @ts-expect-error deliberately wrong payload shape for 'job_status'
        payload: { foo: 'bar' },
      }),
    ).toThrow()
  })
})
