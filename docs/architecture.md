# Proposed bot architecture

## Principles

The bot is read-only against Neptune data in the first release. It must fail closed on unknown network identity, stale data, malformed big integers, and unavailable statistics. It should link users to the explorer rather than reproduce unverified tokenomics.

## Module structure

```text
src/
  bot/
    create-bot.ts
    commands/
    callbacks/
    middleware/
  neptune/
    explorer-client.ts
    xnt-rpc-client.ts
    schemas.ts
    network-identity.ts
    statistics.ts
  cache/
    memory-cache.ts
    redis-cache.ts          # optional, only after measurement
  presentation/
    format-number.ts
    format-block.ts
    charts.ts
  config.ts
  health.ts
  index.ts
tests/
  fixtures/
```

Use Node.js LTS, strict TypeScript, grammY, Zod, Vitest, and native `fetch`/an HTTP client with timeouts and abort signals. PostgreSQL is not in the first release unless the explorer API cannot provide the required historical range.

## Data flow

1. Telegram update enters grammY middleware.
2. Command handler validates user input with Zod.
3. A typed Neptune client requests the verified explorer endpoint or pinned node RPC.
4. Response is schema-validated, freshness-checked, and normalized without lossy numeric conversion.
5. A short TTL cache absorbs repeated group requests.
6. Presentation formats values and includes source timestamp/“indexed at” metadata.
7. Errors become explicit user-facing retry messages and structured logs; no success-shaped fallback is returned.

## Telegram design

Register commands with Bot API `setMyCommands` during deployment/startup. Keep read-only commands small: `/status`, `/block`, `/difficulty`, `/reward`, `/chart`, `/help`. Use inline callback buttons for duration selection and pagination, always answer callback queries, and encode only short opaque identifiers in callback data.

Prefer webhook deployment for a public HTTPS service with one process per update stream. Telegram requires a valid certificate and supports webhook ports 443, 80, 88, and 8443; use a secret URL path or `secret_token` and do not rely on redirects. Use long polling for local development or a simple single-instance deployment, remembering that `getUpdates` and webhooks are mutually exclusive and pending updates are retained for no more than 24 hours. Graceful shutdown must stop polling/webhook intake, wait for in-flight requests, then close cache/database clients.

Telegram's documented free sending limits are approximately one message/second per chat, 20 messages/minute in a group, and 30 messages/second for bulk notifications. Handle HTTP 429 responses and `retry_after`; do not build a broadcast feature until it has a queue and backoff policy.

grammY's command middleware is appropriate for registering handlers, but command menu registration is a Bot API operation (`setMyCommands`) and should be treated as deployment configuration. Callback queries must be answered promptly with `answerCallbackQuery`, even when the data request fails.

## Security

- Store the bot token only in the runtime secret manager/environment; never log it.
- Restrict webhook secret tokens and validate Telegram origin/signature as supported by the chosen setup.
- Apply per-user and per-chat command throttling before expensive upstream requests.
- Escape Telegram Markdown/HTML output and cap message sizes.
- Treat user-provided block heights, hashes, and miner digests as untrusted.
- Use allowlisted upstream URLs and TLS verification.
- Redact authorization headers and upstream response bodies from error logs.
- Keep explorer CORS irrelevant to the bot: server-side requests do not need browser CORS.
- Do not collect message history beyond operational metrics required for abuse prevention.

## Caching

Start with bounded in-memory TTL caches:

- overview/tip: 5–15 seconds;
- block lookup: 60 seconds;
- charts: 5–15 minutes;
- network identity: process lifetime plus explicit health recheck.

Add Redis only if there are multiple bot replicas, measured cache contention, or a need for shared rate limiting. Redis adds recurring hosting cost and an operational dependency.

## Deployment

Containerize the bot with Docker, run as a non-root user, and expose a health endpoint. Use webhook mode behind a managed HTTPS reverse proxy or platform. Keep one replica until update ordering and shared throttling requirements justify horizontal scaling. Pin Node and dependency versions, enable automatic restarts, and alert on upstream 5xx, schema validation failures, stale data, and Telegram API errors.

## Alternatives and cost trade-offs

- Explorer API only: lowest cost and fastest delivery, but depends on operator availability, retention, rate limits, and indexing correctness.
- Direct full node/RPC: stronger freshness/independence, but requires disk, compute, upgrades, peer connectivity, and operational monitoring.
- PostgreSQL/TimescaleDB: useful for durable historical snapshots and custom aggregates; unnecessary if the explorer API already serves the required charts.
- Redis: useful for shared TTL/rate-limit state across replicas; unnecessary for one modest process.
