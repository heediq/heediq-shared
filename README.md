# @heediq/shared

Shared Zod schemas and TypeScript types consumed by `heediq-api`, `heediq-web`, and `heediq-worker-summarization`.

## Purpose

Single source of truth for all API request/response shapes, domain objects, SQS message payloads, and WebSocket message shapes. Prevents silent contract drift between repos (D-033).

Published as a private package to GitHub Packages (`@heediq/shared`). Consuming repos install it as a versioned dependency; Renovate opens bump PRs when a new version is published (D-048).

## Key Files

- `src/enums.ts` — `Tier`, `WhisperModel`, `JobStatus`, `RecordingStatus`, `OrgRole`, `SourceType`
- `src/domain.ts` — `Org`, `User`, `Recording`, `Job`, `Summary` domain schemas
- `src/requests.ts` — API request/response schemas (`CreateRecordingRequest`, `EnqueueJobRequest`, `PresignUploadRequest`, etc.)
- `src/messages.ts` — SQS message schemas (`TranscriptionJobMessage`, `SummarizationJobMessage`) and WebSocket push schema (`WsStatusMessage`)
- `src/api.ts` — `ApiSuccess<T>` / `ApiError` response envelope types
- `src/index.ts` — re-exports everything

## Contracts

Each schema exports both a Zod schema and an inferred TypeScript type. Consumers use the type for TypeScript, and the schema for runtime validation at boundaries.

```ts
import { RecordingSchema, type Recording, EnqueueJobRequestSchema } from '@heediq/shared'

// Runtime validation (parse throws on invalid input)
const recording = RecordingSchema.parse(rawData)

// Type use
function process(r: Recording) { ... }
```

## Versioning

Current version: `0.1.1`. Graduates to `1.0.0` when the contract stabilises (D-047). Use semver — consuming repos pin to a version and Renovate handles bumps.

Breaking changes (remove/rename a field, tighten a validator) require a minor version bump and a coordinated update in consuming repos.

## Testing

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
pnpm typecheck     # tsc --noEmit
pnpm build         # emit to dist/
```

49 unit tests covering valid + invalid inputs for every schema.

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
- CI 403 on install = consuming repo not added to package access (see First-time setup above).
