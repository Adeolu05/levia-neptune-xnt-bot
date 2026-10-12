# Implementation plan and acceptance criteria

## Phase 0: verification gate

1. Obtain the live API base URL by inspecting browser network requests or from the NeptuneScan operator.
2. Capture redacted fixtures for overview, tip/block, trends, and WebSocket events.
3. Identify the live node's genesis digest, network identifier, xnt-core commit/protocol version, and RPC methods.
4. Compare the live explorer and current xnt-core on genesis, tip, consensus constants, difficulty, reward, and canonical-chain behavior.
5. Confirm rate limits, cache headers, retention, WebSocket reconnect behavior, and failure responses.

No bot implementation should begin until this gate is accepted.

## Phase 1: minimal bot

- Bootstrap a strict TypeScript Node.js LTS project.
- Add grammY, Zod, Vitest, and a typed configuration loader.
- Implement `GET /overview`, block lookup, and network identity checks.
- Add `/status`, `/block`, `/difficulty`, `/reward`, and `/help`.
- Add timeout, retry with bounded backoff for idempotent reads, schema validation, and explicit stale/error states.
- Add fixture-driven tests from Phase 0.

## Phase 2: historical features

- Implement duration callbacks for difficulty/reward/fee charts.
- Render charts as Telegram images only after chart data and image delivery are verified; otherwise send a compact text table.
- Add WebSocket support only if the live event schema is stable; polling the verified tip is the safer fallback.
- Add optional PostgreSQL snapshots if the API lacks durable historical access or independent verification is required.

## Phase 3: operations

- Webhook deployment, health/readiness checks, graceful shutdown, structured logs, metrics, and alerting.
- Set Telegram command menu and description.
- Document local polling development and production webhook configuration.
- Load test upstream request concurrency and Telegram rate-limit handling.

## Test strategy

- Unit: decimal arithmetic, duration selection, timestamp/interval calculations, formatting, Zod schemas, callback parsing.
- Contract: replay real redacted fixtures and reject missing/renamed fields.
- Integration: mock Telegram API and verified Neptune API; test retries, 404, 429, 5xx, timeout, stale data, malformed JSON, and WebSocket reconnect.
- Property tests: no negative elapsed time, no precision loss for large integers, no division by zero, and deterministic chart formatting.
- Smoke: deploy a staging bot with a separate token and exercise every command.

## Acceptance criteria

- Every shipped statistic has a cited endpoint/RPC method, field name, unit, authority classification, freshness policy, and fixture.
- Bot refuses to label data as mainnet until genesis/network identity matches the approved record.
- Large numeric values round-trip exactly; no JavaScript floating-point conversion for work, difficulty, rewards, or fees.
- Upstream failure produces a clear retry response and an observable structured error.
- Webhook and polling modes are documented and graceful shutdown passes an integration test.
- Telegram callback queries are acknowledged, messages are escaped, and rate-limit backoff is bounded.
- Supply is either backed by a verified source or explicitly shown as unavailable.
- No credentials, tokens, or private URLs appear in source, fixtures, logs, or documentation.

## Unresolved decisions

| Decision | Depends on |
|---|---|
| Explorer API versus direct RPC | Live API reachability, freshness, and rate limits |
| PostgreSQL history | Explorer retention and required historical range |
| Redis | Replica count and measured shared-cache/rate-limit need |
| WebSocket versus polling | Verified live event schema and reconnect behavior |
| Supply/emission commands | Official tokenomics and active-mainnet identity |
| Webhook versus polling production mode | Hosting platform HTTPS and operational requirements |

