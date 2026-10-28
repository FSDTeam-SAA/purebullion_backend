# Pure Bullion AI backend handoff

This document summarizes the AI integration implemented during this conversation for the backend team. It describes the current code, local testing path, verification, and remaining rollout checks. The original integration prompt is separate from this handoff.

## What was implemented

- Added `src/modules/ai/` and registered `AiModule` in `src/app.module.ts`.
- The Next.js client calls this NestJS API with a user JWT. NestJS calls the internal FastAPI AI service with the shared `AI_SERVICE_TOKEN`. The token is never sent to the browser.
- Added streamed chat, a MongoDB conversation index and message history, admin briefing generation and review, knowledge ingestion, and signal rationale generation.
- Added `ai-chat-test.html`, served by NestJS at `GET /api/v1/ai/test`.
- Added a development-only local test chat route so a logged-in user can test without purchasing a subscription. The production chat route still requires an active subscription.

## Configuration

| Variable | Purpose | Default in code |
|---|---|---|
| `AI_SERVICE_URL` | Base URL of the internal FastAPI service | `http://localhost:8000` |
| `AI_SERVICE_TOKEN` | Shared secret for outbound AI calls and the existing `/internal/ai` inbound guard | No usable default; requests fail if unset |
| `AI_SERVICE_TIMEOUT_MS` | Timeout for nonstreaming AI calls, including response bodies | `120000` |
| `AI_TEST_PLAN_SLUG` | AI service tier for the local test route | `basic` |

These variables are documented in `.env.example`; values for each environment belong in that environment's secret configuration. `AI_SERVICE_TOKEN` must equal `SERVICE_TOKEN` in the AI service. The existing `ai-data` guard uses the same token for AI service calls back into NestJS.

`AI_TEST_PLAN_SLUG` must be a key in the AI service's `TIER_LIMITS_JSON`. A manual local probe with an intentionally nonexistent conversation returned `404 NOT_FOUND` for both `basic` and `pro`, indicating that those tier headers passed the AI service's initial checks. This was not a successful end-to-end chat test.

## Member API

All paths below have the `/api/v1` prefix. Except for the HTML test page, routes use the existing `JwtAuthGuard`. JSON success responses use the global `{ statusCode, success, message, data }` envelope. The chat routes return raw Server-Sent Events (SSE) instead.

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/ai/chat` | Stream a reply. Body: `{ "message": "...", "conversationId": "optional UUID" }`. Requires an active, unexpired subscription. |
| `GET` | `/ai/conversations?page=1&limit=20` | List the current user's nondeleted conversations, newest first. Limit is capped at 100. |
| `GET` | `/ai/conversations/:conversationId/messages` | Read stored user and assistant messages after an ownership check. |
| `PATCH` | `/ai/conversations/:conversationId` | Rename with `{ "title": "..." }`. |
| `DELETE` | `/ai/conversations/:conversationId` | Soft delete from the UI index. It does not erase the AI service audit log. |
| `GET` | `/ai/briefings` | List only published briefing drafts for authenticated users. |

`message` is limited to 1–4000 characters by `ChatDto`; `conversationId` must be a UUID. For normal chat, the backend looks up an `ACTIVE` subscription whose `endDate` is in the future, populates `SubscriptionPlan.slug`, lowercases it, and sends that slug in `X-User-Plan`. No subscription returns `403` before contacting the AI service. A continuing conversation must belong to the same user and must not be soft deleted.

### Chat stream and persistence

`AiClientService` sends `X-Service-Token`, `X-User-Id`, `X-User-Plan`, and JSON content type to `POST /v1/chat`. It uses Node `fetch` and an `AbortController`; streaming calls have no short timeout. The controller sets SSE, no-cache, keep-alive, and no-buffering headers. The global response interceptor skips the two SSE chat routes.

The upstream bytes are forwarded to the client unchanged while `AiSseParser` parses them for storage:

1. `meta` supplies the AI conversation UUID. For a new chat, create `AiConversation` with the first message trimmed to a 60-character title. Insert the user message.
2. `token` appends text to the assistant reply. `replace` replaces the accumulated reply entirely. The final text, including the AI service disclaimer, is stored without trimming or rewriting.
3. Completed `tool_call` names are saved in `toolsUsed`. `done` stores a complete assistant message with AI message ID, usage, and replacement flag. `error` stores the partial text and error code.
4. Client disconnect aborts the upstream request and stores an `incomplete` assistant message when a conversation UUID was already received.

Prestream AI errors store no chat messages. HTTP `400`, `403`, `404`, `422`, `429`, and `503` are passed through; upstream `401` becomes `502` because it signals a service-token configuration error. Other upstream failures become `502`, and transport failure becomes `503`. The global exception filter includes AI `code` and guardrail `flags`; `Retry-After` is forwarded for `429` and exposed through CORS.

## MongoDB collections

| Collection | Main fields and indexes |
|---|---|
| `ai_conversations` | `user`, unique `conversationId`, `title`, `messageCount`, `lastMessageAt`, `isDeleted`, timestamps. Index: `{ user: 1, isDeleted: 1, lastMessageAt: -1 }`. |
| `ai_messages` | `conversationId`, `user`, `role`, exact `content`, `toolsUsed`, `status`, `errorCode`, `aiMessageId`, `replaced`, `usage`, timestamps. Index: `{ conversationId: 1, createdAt: 1 }`. |
| `briefing_drafts` | AI response fields, including `id`, `briefing_type`, `status`, title, markdown, disclaimer, and timestamps. `id` is unique. |

The backend collection is the UI source for conversation lists and history. The AI service keeps its own audit log. The AI service's `GET /v1/chat/conversations/:id` history fallback is **not wired in**; if local Mongo history needs resynchronization, the team must add it.

## Admin and signal flows

All admin routes require JWT plus `RoleType.ADMIN`.

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/ai/admin/briefings/generate` | Calls `POST /v1/briefings/generate` with `briefing_type`; stores the returned draft. Allowed types: `morning_snapshot`, `daily_briefing`, `weekly_wrap`, `week_ahead`. |
| `GET` | `/ai/admin/briefings` | Lists all briefing drafts. |
| `PATCH` | `/ai/admin/briefings/:id/approve` | Moves `draft` or `needs_review` to `approved`. |
| `PATCH` | `/ai/admin/briefings/:id/reject` | Moves `draft` or `needs_review` to `rejected`. |
| `PATCH` | `/ai/admin/briefings/:id/publish` | Moves only `approved` to `published`. The AI service itself never publishes. |
| `POST` | `/ai/admin/knowledge/ingest` | Calls `POST /v1/knowledge/ingest` with the validated source content. |

When `SignalsService.createSignal` saves a new signal, it calls `POST /v1/signals/rationale` using its `signalId`, then saves `rationale`, `smsLine`, `rationaleModel`, and `rationalePromptVersion` on the signal. If the AI call fails, signal creation still succeeds and logs a failure without the service token or message body. There is no retry queue for missing rationales yet.

## Local browser test

Open `http://localhost:5000/api/v1/ai/test` from the backend server. The page can log in through `/auth/login` or accept an existing access token, send streamed chat, show tool status, stop a stream, list conversations, and reopen stored messages. It keeps the token in page memory only.

By default the page uses `POST /ai/test/chat`. This route still requires a user JWT but bypasses the subscription lookup with `AI_TEST_PLAN_SLUG`. It is available only when `app.env` is `development` and the direct socket peer is `127.0.0.1`, `::1`, or `::ffff:127.0.0.1`. Checking **Use normal subscription-required chat route** makes the page call `/ai/chat` instead. The test route should not be exposed through a development-mode reverse proxy whose connection to NestJS appears to come from loopback.

The page is served from `process.cwd()/ai-chat-test.html`; deployments that retain the test page must include that file and start the process from the repository root. No separate server on port 3000 is needed. The public page itself contains no service token, but its chat requests require JWT.

## Verification performed

- `tsc --noEmit --incremental false`: passed.
- `nest build`: passed.
- Jest: 7 suites, 49 tests passed. AI client, SSE parser, chat service, and local test route tests use mocks; automated tests do not call the real AI service.
- ESLint on `src/modules/ai/**/*.ts`: passed with no errors or warnings.
- Repository-wide ESLint: **not passing**; 1,628 errors across 94 files when checked without `--fix`. This is a broader existing cleanup task. Avoid running the `lint` npm script just to inspect results because that script applies `--fix` across the repository.
- The live local backend returned HTTP 200 for `/api/v1/ai/test`; unauthenticated `POST /api/v1/ai/test/chat` returned HTTP 401. The AI service `/health` responded locally. A fully authenticated live chat was not run during this work.

## Rollout checks for the team

1. Align subscription plan slugs with the AI service tier keys. The backend currently seeds `essential`, `professional`, and other product plan slugs, while the prompt examples use `basic` and `pro`. Normal chat forwards the actual plan slug unchanged; the AI service will reject it with `403` unless `TIER_LIMITS_JSON` contains that slug.
2. Configure the same shared token in both services and keep the FastAPI service internal. Verify one real subscribed chat, continuation, rate limit, disclaimer preservation, and conversation reopen in the target environment.
3. Decide whether to add a retry job for failed signal rationales and a resynchronization path from AI service conversation history.
4. Address the repository-wide lint backlog before treating full lint as a merge gate.

## Related security cleanup

During implementation, an obfuscated tracked `api.js` payload and appended obfuscated code in `eslint.config.mjs` were found. The payload file was removed, the ESLint config was restored to its intended rules, and `package.json` build/start scripts no longer run `node api.js`. Review the security cleanup commit (`c5594ac`) and rotate any credentials that may have been exposed if the old build/start scripts ran in a sensitive environment.
