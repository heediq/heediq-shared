# @heediq/shared

Shared Zod schemas and TypeScript types consumed by `heediq-api`, `heediq-web`, and
`heediq-worker-summarization` as an installed npm package, and hand-mirrored (no cross-language
package) by `heediq-worker-transcription/src/models.py` for `TranscriptionJobMessage`/
`SummarizationJobMessage`.

## Purpose

Single source of truth for all API request/response shapes, domain objects, SQS message payloads, and WebSocket message shapes. Prevents silent contract drift between repos (D-033).

Published as a private package to GitHub Packages (`@heediq/shared`). Consuming repos install it as a versioned dependency; Renovate opens bump PRs when a new version is published (D-048).

## Key Files

- `src/enums.ts` — `Tier`, `WhisperModel`, `JobStatus`, `SourceStatus`, `OrgRole`, `SourceType`
- `src/domain.ts` — `Org`, `User`, `Source`, `Job`, `Summary` domain schemas
- `src/permissions.ts` — RBAC permission catalog (D-102): `PERMISSIONS`/`Permission`, `SYSTEM_ROLES`, `DEFAULT_ORG_RBAC_SEED`, and `Role`/`Group`/`RoleAssignment` domain schemas
- `src/audit.ts` — RBAC audit trail (D-102): `AuditPayloadMap` (per-resource-type `before`/`after` payload shapes) and `AuditLogEntrySchema`
- `src/requests.ts` — API request/response schemas (`CreateSourceRequest`, `EnqueueJobRequest`, `PresignUploadRequest`, `AuthMethodSchema`/`ListAuthMethodsResponseSchema`, etc.)
- `src/messages.ts` — SQS message schemas (`TranscriptionJobMessage`, `SummarizationJobMessage`)
- `src/ws.ts` — generalized real-time WebSocket framework (D-109, supersedes D-061's one-off `WsStatusMessage`): `WsScopeSchema` (`user`/`org`/`broadcast`), `WsEventPayloadMap` (per-event-type payload registry — `job_status` is the first entry), `WsEventEnvelopeSchema` (discriminated on `type`), `buildWsEvent()`. Carries zero AWS SDK dependencies — the actual push call lives in `heediq-api/src/lib/wsPush.ts`.
- `src/api.ts` — `ApiSuccess<T>` / `ApiError` response envelope types
- `src/logger.ts` — `createLogger(service)` structured JSON logger with correlation fields (`sourceId`/`requestId`), a recursive PII-redaction denylist (D-085), and a `LOG_LEVEL`-gated `debug`/`info`/`warn`/`error` threshold, default `info` (D-093)
- `src/passwordPolicy.ts` — `PASSWORD_POLICY`, `PASSWORD_POLICY_RULES`, `isPasswordPolicyCompliant()`: single source of truth for password rules, consumed by heediq-api and heediq-web. The Cognito User Pool's `passwordPolicy` in `heediq-infra/lib/foundation/cognito.ts` is a separate literal kept in sync via the periodic consistency-check, not by import — see `DECISIONS.md` D-020 and `rules/10-consistency-check.md`.
- `src/index.ts` — re-exports everything

## Contracts

Each schema exports both a Zod schema and an inferred TypeScript type. Consumers use the type for TypeScript, and the schema for runtime validation at boundaries.

```ts
import { SourceSchema, type Source, EnqueueJobRequestSchema } from '@heediq/shared'

// Runtime validation (parse throws on invalid input)
const source = SourceSchema.parse(rawData)

// Type use
function process(s: Source) { ... }
```

`Source` (formerly `Recording`) is the generic ingested-content entity per D-068 — any unit a user
puts into the system (audio today; PDF/doc/image/pasted text as ingestion paths land), not just
audio. It carries a `labels: string[]` field for free-form tagging, independent of any future
Container association. `Container` (project/epic/story hierarchy) is planned but not yet added to
this package — see `DECISIONS.md` D-068/D-069.

## Versioning

Current version: `0.12.0`. Graduates to `1.0.0` when the contract stabilises (D-047). Use semver — consuming repos pin to a version and Renovate handles bumps.

**0.12.0 breaking change (D-109):** `messages.ts`'s one-off `WsStatusMessageSchema` (D-061) replaced
by `src/ws.ts`'s generic `WsEventEnvelopeSchema` + `WsEventPayloadMap` registry, so any future feature
can push a real-time event (new `type` entry in the map) instead of growing a bespoke message shape.
Addressing also generalized from a single per-resource scope to three reusable ones: `user`/`org`/
`broadcast`. `job_status` is migrated as the first registry entry, unchanged in content. Consuming
repos importing `WsStatusMessage` must switch to `buildWsEvent({ scope, type: 'job_status', payload })`.

**0.9.0 additive change (D-102, Phase 1 of the RBAC & audit trail build-out):** new `permissions.ts`
(`PERMISSIONS`/`Permission` catalog, `SYSTEM_ROLES`, `DEFAULT_ORG_RBAC_SEED`, `Role`/`Group`/
`RoleAssignment` schemas) and `audit.ts` (`AuditPayloadMap`, `AuditLogEntrySchema`) — the shared
contract for the dynamic per-org RBAC framework and unified audit trail replacing D-017's fixed
Admin/Member model. `OrgSchema` gains an optional `defaultRoleId` field. No existing schema
changed shape; nothing consumes these new exports yet — `heediq-api` wiring lands in Phase 2/3.
Non-breaking.

**0.8.0 breaking change:** `link/confirm`'s OTP code moved into its own `LinkVerifyOtpRequestSchema`
(used by `POST /auth/link/verify-otp`) and was removed from `LinkConfirmRequestSchema` — `verify-otp`
now confirms the code on its own before `confirm` ever sets a password, so the code is checked before
the caller can proceed to the password step.

**0.7.0 additive change:** new `passwordPolicy.ts` (`PASSWORD_POLICY`, `PASSWORD_POLICY_RULES`,
`isPasswordPolicyCompliant()`) — single source of truth for password rules for heediq-api and
heediq-web, so a live "does this password meet requirements" UI checklist can't silently drift
from the backend's understanding of the same rules. Non-breaking.

**0.6.0 additive change (D-093):** `createLogger(service)` gains a `debug` level and a `LOG_LEVEL`
env-var threshold (`debug < info < warn < error`, default `info`, invalid values fall back to
`info`) — logger usage is now mandatory for every service, `debug` is silent unless `LOG_LEVEL=debug`
is set, letting ops get verbose output on one Lambda via an env-var flip with no redeploy. Non-breaking.

**0.5.0 additive change (D-085):** new `createLogger(service)` in `logger.ts` — structured JSON
logs (`{ timestamp, level, service, message, ...meta }`), correlated by `sourceId` (once a job
exists) or a per-request `requestId`, with a case-insensitive substring denylist
(`transcript`, `email`, `audioUrl`, `password`, `token`, `secret`, `authorization`) applied
recursively to redact PII from log metadata. Non-breaking.

**0.4.0 additive change (D-091):** new `AuthMethodSchema`/`ListAuthMethodsResponseSchema` in
`requests.ts` for `GET /api/v1/auth/methods` (lists a user's active sign-in methods). Non-breaking.

**0.3.0 additive change (D-078):** `UserSchema` gains `passwordSet: boolean` (defaults `true` so
existing rows parse unchanged); new request/response schemas `LookupEmailRequest/Response`,
`LinkStartRequest`, `LinkConfirmRequest`, `LinkAddProviderRequest` for the cross-provider account
linking flow. Non-breaking — no existing field renamed or removed.

**0.2.0 breaking change (D-068):** `Recording` → `Source`, `recordingId` → `sourceId` across all
schemas (`domain.ts`, `requests.ts`, `messages.ts`); `RecordingStatus` → `SourceStatus`;
`CreateRecordingRequest`/`UpdateRecordingRequest` → `CreateSourceRequest`/`UpdateSourceRequest`;
added `labels: string[]` (default `[]`) to `SourceSchema`. Consuming repos must update field/type
references and the underlying DynamoDB table name (`heediq-recordings` → `heediq-sources`) together.

Breaking changes (remove/rename a field, tighten a validator) require a minor version bump and a coordinated update in consuming repos.

## Testing

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
pnpm typecheck     # tsc --noEmit
pnpm build         # emit to dist/
```

138 unit tests across 9 files covering valid + invalid inputs for every schema.

## First-time setup for consuming repos

After publishing a new version, consuming repos' CI needs read access to the package. **One-time per new consuming repo:**

1. Go to **github.com/orgs/heediq/packages/npm/shared** → Package settings → **Manage repository access**
2. Add the consuming repo (e.g. `heediq-api`, `heediq-web`, `heediq-worker-summarization`)

This grants `GITHUB_TOKEN` in that repo's CI the right to `pnpm install @heediq/shared`. Without it, CI gets a 403.

**Local dev:** add a classic PAT with `read:packages` scope to `~/.npmrc`:
```
//npm.pkg.github.com/:_authToken=YOUR_PAT
```

## Gotchas & Constraints

- `module: NodeNext` + `.js` extensions required in imports — TypeScript ESM with NodeNext resolution.
- `allowBuilds.esbuild: true` in `pnpm-workspace.yaml` — required by vitest's bundler.
- Publish runs on `main` only. Bump `version` in `package.json` before merging to `main`.
