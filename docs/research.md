# Neptune Privacy / NeptuneScan research

Research date: 2026-10-12. This document records checked sources, not assumptions.

## Scope and sources

Inspected:

- [NeptuneScan explorer repository](https://github.com/neptuneprivacy/neptunescan-explorer), including its OpenAPI file, Go handlers, models, frontend environment examples, Docker configuration, and RPC client.
- [Current xnt-core repository](https://github.com/neptuneprivacy/xnt-core), including the block and mining documentation and the JSON-RPC HTTP client.
- [Current live explorer](https://neptunescan.io/), including its HTML/Next.js assets and public URL probes.
- [Telegram Bot API](https://core.telegram.org/bots/api) and [grammY documentation](https://grammy.dev/).

The Phase 3 source trace used observed default-branch revisions:
[NeptuneScan `cc7bf29b057cbc33e4b690b62c6ed5e3018112c1`](https://github.com/neptuneprivacy/neptunescan-explorer/commit/cc7bf29b057cbc33e4b690b62c6ed5e3018112c1),
[xnt-core `cc8e8704026c916d545f02aa4d03b5693b6a58dd`](https://github.com/neptuneprivacy/xnt-core/commit/cc8e8704026c916d545f02aa4d03b5693b6a58dd), and
[xnt-explorer `95c14173f272a4e286449ac7f2b5fac4e06ee071`](https://github.com/neptuneprivacy/xnt-explorer/commit/95c14173f272a4e286449ac7f2b5fac4e06ee071). These revisions should be
pinned in any later integration implementation.

The research began before the bot repository had an application
implementation. The Phase 1 Telegram foundation was added afterward; this
research pass did not modify that foundation, dependencies, or runtime
behavior.

## Confirmed explorer architecture

The checked-in NeptuneScan explorer is a Next.js frontend and Go backend. The backend:

- listens on `0.0.0.0:8080` in the application, while Docker maps the externally configured API port;
- registers generated OpenAPI handlers below `/api`;
- exposes `/api/block/ws` for a WebSocket;
- starts block and mempool subscription goroutines;
- connects to a configured Neptune RPC URL and PostgreSQL/TimescaleDB, with Redis used by the fetcher;
- allows wildcard CORS in the checked-in application configuration.

The checked-in frontend environment names are `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and `NEXT_PUBLIC_SWAGGER_URL`. The repository's frontend config defaults to `https://neptune.vxb.ai`, `wss://neptune.vxb.ai/api/block/ws`, and `https://neptune.vxb.ai/api/swagger.json`, while the checked-in example environment points at a development host. The backend environment names include `NETWORK`, `NEPTUNE_RPC`, PostgreSQL settings, and Redis settings. No credentials are reproduced here.

The repository's OpenAPI contract is at [`backend/app/api/api.yaml`](https://github.com/neptuneprivacy/neptunescan-explorer/blob/main/backend/app/api/api.yaml). Generated route registration is in [`server.gen.go`](https://github.com/neptuneprivacy/neptunescan-explorer/blob/main/backend/app/api/server.gen.go). The main server and WebSocket registration are in [`main.go`](https://github.com/neptuneprivacy/neptunescan-explorer/blob/main/backend/app/main.go).

## Live deployment status

`https://neptunescan.io/` currently serves a Next.js “Neptune Privacy
Explorer” page and includes a visible API navigation item. On that host,
`https://neptunescan.io/api/overview` and
`https://neptunescan.io/api/swagger.json` returned HTTP 404. These results do
not describe the separate API subdomain.

Therefore the checked-in repository API must **not** be treated as the live API without discovering the current deployment's API URL from its runtime network requests or operator documentation. The live frontend assets were inspected, but their minified bundle did not provide a reliable, human-readable public base URL. This is a release blocker for authoritative production statistics.

## Current xnt-core identity and consensus facts

The current repository identifies itself as `xnt-core — Neptune Privacy Core` and documents the reference implementation for xnt. Its block documentation confirms:

- block headers contain height, predecessor digest, timestamp, proof-of-work, cumulative proof of work, difficulty, and guesser digest;
- timestamps are when blocks were found;
- cumulative proof of work is an approximate number of hashes over the block's lineage;
- difficulty is an approximate number of hashes required to find a block;
- minimum block time is 60 seconds;
- cumulative proof of work advances by the predecessor's difficulty;
- a canonical block is on the chain with the most cumulative proof of work;
- future-dating is limited to five minutes.

The mining documentation states that the initial block subsidy is 128 and that it halves every 160,815 blocks. It also describes a rebooted network whose first generation accounts for 139,505 blocks and references legacy-network blocks. **Do not use this for production tokenomics without checking the current constants**: the explorer's current data and the exact deployed binary must be checked before publishing an emission schedule.

The xnt-core JSON-RPC client posts JSON-RPC 2.0 requests to the configured URL. Its checked-in integration test uses `tip` and demonstrates that archival `get_block` is unavailable by default. The current RPC method names and result schemas should be generated from the exact xnt-core revision deployed by the node.

## Mainnet equivalence assessment

**UNVERIFIED.** The checked-in explorer repository README references an older `VxBlocks/neptune-wallet-core` “explorer” branch and a REST port, while the current official xnt-core repository uses the Neptune Privacy xnt naming and JSON-RPC client. The separate [xnt-explorer repository](https://github.com/neptuneprivacy/xnt-explorer) discovers the connected node's network, but the Go NeptuneScan explorer has no visible chain-ID validation. These are not enough to prove that the live explorer, its backend node, and current xnt-core `main` are the same active mainnet and consensus rules.

Verification required before implementation:

1. Obtain the live explorer backend base URL from the current frontend network trace or operator.
2. Query its tip and genesis identifiers.
3. Run the same queries against a current xnt-core mainnet node.
4. Compare network identity, genesis digest, tip height, protocol version, difficulty rules, reward constants, and canonical-chain semantics.
5. Pin the verified xnt-core commit and explorer API contract in the bot repository.

## Findings by required statistic

| Statistic | Verified source | Status |
|---|---|---|
| Current height/latest block | Checked-in explorer `GET /api/overview`; node REST client `/rpc/block_info/tip` | Verified in source; live URL UNVERIFIED |
| Hashrate/network speed | Explorer calculates cumulative-work delta over the latest 144 blocks divided by timestamp delta | Verified calculation in source; naming is “network speed,” not independently validated hashrate |
| Difficulty | `overview.proof_target`, block `proof_target`, `/trend/target` average of stored difficulty | Verified source semantics; live value UNVERIFIED |
| Average block time | Difference between latest and 144-block-old timestamps divided by `dist_144 - 1` | Verified source calculation; live value UNVERIFIED |
| Supply | No checked-in explorer overview field for circulating or total supply | UNVERIFIED / no source found |
| Block reward/emission | `total_reward`, `day_reward`, trend reward sum `coinbase_amount`; xnt-core mining docs describe subsidy and fees | Partially verified; exact current schedule requires deployed constants |
| Historical charts | `/trend/target`, `/trend/reward`, `/trend/fee`, backed by TimescaleDB block history | Verified in checked-in source; live availability UNVERIFIED |

The separate Rust xnt-explorer exposes `/rpc/circulating_supply` and `/rpc/total_supply`, but that is a different service and deployment. Their response schemas, inclusion rules, and relationship to `neptunescan.io` were not verified.

The current xnt-explorer source does define the calculation behind those
candidate routes: it starts with `PREMINE_MAX_SIZE`, adds completed and
current-generation subsidy, and returns whole-coin values. Its comments assume
old-chain redemption claims have been rewarded. The same service can return
deterministic imagined block data when its `MOCK` fallback is enabled after an
RPC failure. Therefore these routes are not suitable evidence of live supply
without deployment, configuration and response verification.

The current xnt-core source assigns mainnet network ID `0`, records a mainnet
launch timestamp of `1764288000000`, and has a source-level block-0 digest
expectation:

`3b012c9abf353d9201bc3328391bbd0d43c5edb91da1085be15a3fc52ad55f65ea115d255922b5a4`

This digest is source/test evidence only; it was not obtained from a live RPC.
The same source defines 8,640 blocks per generation, a one-XNT tail subsidy
from generation 72, and a 1,942,384-XNT premine. Those values conflict with
stale tokenomics text in the checked-in frontend, so neither source should be
published as live tokenomics until the deployed revision and network identity
are matched.

## Sample-response rule

A block-detail response was captured from the separate API subdomain, but no
successful live metric response was established. The implementation must not
ship copied or fabricated samples. Any further verification task must capture
redacted JSON fixtures from the live API and record the request URL, UTC
timestamp, response status, content type, and node/explorer revision.

## Phase 3 endpoint verification table

| Source | Method/path | Source status | Live status on 2026-10-12 | Safe conclusion |
|---|---|---|---|---|
| NeptuneScan frontend | `GET /api/overview` | Confirmed in `frontend/src/utils/api/apis.ts`, OpenAPI and Go handler | `https://neptunescan.io/api/overview` returned 404 | Candidate indexed overview only; deployment URL unresolved. |
| NeptuneScan block-detail API | `GET /api/block/92031` | Response shape observed in a successful sample | `https://api.neptunescan.io/api/block/92031` returned HTTP 200 with JSON `success: true` | Endpoint reachability and observed block-detail shape only; network identity, freshness, and production reliability remain unverified. |
| NeptuneScan overview API | `GET /api/overview` | Route exists in checked-in source | `https://api.neptunescan.io/api/overview` returned HTTP 200 with JSON `success: false` | Reachable but not a successful metric response; do not use it for overview statistics. |
| NeptuneScan frontend | `GET /api/blocks?page=&page_size=` | Confirmed in frontend, OpenAPI and Go handler | Same-origin candidate not verified | Candidate canonical history route. |
| NeptuneScan frontend | `GET /api/trend/target?duration=` | Confirmed in frontend, OpenAPI and Go handler | Same-origin candidate not verified | Candidate difficulty trend; bucketed average, not raw history. |
| NeptuneScan frontend | `GET /api/trend/reward?duration=` | Confirmed in frontend, OpenAPI and Go handler | Same-origin candidate not verified | Candidate reward/fee trend. |
| NeptuneScan backend | `GET /api/block/ws` | Confirmed registration in `main.go` | WebSocket not live-verified | Candidate event source; reconnect behavior unresolved. |
| NeptuneScan contract | `GET /api/swagger.json` | Confirmed in repository contract | `https://neptunescan.io/api/swagger.json` returned 404 | Current public contract location unresolved. |
| NeptuneScan API-subdomain contract | `GET /api/swagger.json` | Confirmed in repository contract | API-subdomain Swagger endpoint separately observed to work | Distinct from the 404 at `neptunescan.io`; exact deployment and metric correctness remain unresolved. |
| xnt-core JSON-RPC | `POST` methods including `tip`, `height`, `tip_header`, `get_block` | Confirmed in current RPC trait | No public node endpoint tested | Method names are source facts, not live network proof. |

## Phase 3 metric verification table

| Metric | Definition verified in source | Evidence status | Blocking uncertainty |
|---|---|---|---|
| Height/latest block | Highest stored TimescaleDB block in `/overview`; node `tip` is a separate RPC method | Partially verified | Live API/node URL and freshness. |
| Network speed | Cumulative-work delta divided by elapsed seconds over up to 144 blocks | Verified calculation | Work-unit interpretation and whether users may call it hashrate. |
| Difficulty | Stored block difficulty; target trend is time-bucketed SQL average | Verified source semantics | Live value and exact xnt-core numeric interpretation. |
| Average block time | Timestamp difference over the same 144-block window divided by `dist-1` | Verified calculation | Indexed window and live freshness. |
| Supply | No NeptuneScan overview/model field; separate xnt-explorer has candidate routes | Unverified | Canonical UTXO rules, deployment relationship and response semantics. |
| Reward/emission | Explorer sums `coinbase_amount` and fees; xnt-core source documents subsidy rules | Partially verified | Active network, exact deployed constants and treatment of legacy/rebooted history. |
| Historical charts | Timescale queries for target, fee and reward buckets | Verified in checked-in source | Public availability, retention, reorg behavior and rate limits. |

## Unresolved questions and required evidence

1. **Which API serves the live site?** Record browser network requests or obtain
   an operator-provided base URL, then capture status/content type and sanitized
   responses for the routes above.
2. **Is the live explorer on current xnt-core mainnet?** Query network identity,
   genesis digest/header and tip from the live backend and compare them with a
   pinned xnt-core mainnet node. A UI label is insufficient.
3. **What is supply?** Identify an authoritative RPC/API definition or reproduce
   a canonical UTXO sum with rules for burns, timelocks and reorgs.
4. **What does `network_speed_24h` mean operationally?** Confirm the numeric work
   unit and choose a conservative “work rate” label unless protocol evidence
   authorizes a hashrate label.
5. **Are historical rows canonical and retained long enough?** Compare API
   aggregates with node blocks across a reorg boundary and measure ingestion lag.

## Safest first live command

No live statistics command is sufficiently verified yet. The safest first
implementation remains a read-only `/height`-style command only after the live
API base URL, response schema, network identity and freshness checks above have
passed. Do not implement it from the repository route names alone.
