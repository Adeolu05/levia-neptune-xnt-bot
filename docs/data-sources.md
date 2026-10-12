# Neptune data sources and endpoint verification

Research pass checked 2026-10-12. Paths below are from the checked-in
`neptuneprivacy/neptunescan-explorer` repository unless explicitly labeled as
live observations. Repository paths are not automatically confirmed live
endpoints.

## Block lookup endpoint smoke test

The API base URL used for the block lookup is configurable through
`NEPTUNE_API_BASE_URL` and defaults to `https://api.neptunescan.io`.
`GET https://api.neptunescan.io/api/block/92031` returned HTTP 200 with
`success: true` during the Phase 3B smoke test. This successful sample
verifies endpoint reachability and the observed response shape only. It does
not establish canonical network identity, data freshness, or production
reliability. The bot uses `GET /api/block/{height}` and validates the response
before displaying it.

The block detail fields used by the bot are `detail.block` (height),
`detail.block_hash` (hash), `detail.time` (timestamp), `detail.target`
(large numeric string), and `detail.is_canonical` (boolean). Reward and fee
fields are intentionally not displayed because their base-unit conversion has
not been verified.

`GET https://api.neptunescan.io/api/overview` also returned HTTP 200 during
verification but consistently reported `success: false`; it is not used by
the bot. By contrast, `https://neptunescan.io/api/overview` returned HTTP 404,
and `https://neptunescan.io/api/swagger.json` returned HTTP 404. The
API-subdomain Swagger endpoint was separately observed to work; these
host-specific observations must not be generalized across hosts. Live network
identity, base-unit conversion, and data freshness remain unverified.

## Explorer frontend to backend trace

The frontend functions in `frontend/src/utils/api/apis.ts` use Axios with a
25-second timeout. The request interceptor can add `authorization` and
`productName` headers from browser `localStorage`, but the OpenAPI operations
declare `security: []`. This proves an authentication-capable client path, not
that the deployed API requires authentication.

| Frontend function | Method and path | Checked-in response/meaning |
|---|---|---|
| `queryOverviewData` | `GET /api/overview` | `{success, overview}` with height, block hash, timestamp, proof target, cumulative work, network speed, average block time, total/day reward, total/day fee, transaction and UTXO counts. |
| `queryLatestBlocks`, `queryBlocks` | `GET /api/blocks?page={page}&page_size={size}` | Canonical blocks: height, digest, coinbase reward, fee, inputs, outputs, proof target, time, plus count. Both functions call the same route. |
| `queryOrphaned` | `GET /api/orphaned?page={page}&page_size={size}` | Same block-item shape, filtered to orphaned rows. |
| `queryBlockDetail` | `GET /api/block/{height}` | Block height, coinbase reward, gas/fee, hash, canonical flag, target and time. |
| `queryBlockByRpc` | `GET /api/rpc/block/{height_or_hash}` | JSON-encoded internal explorer `models.Block`, obtained through the server's configured node client. |
| `queryStatsTargetChartData` | `GET /api/trend/target?duration=all\|month\|week\|day` | `{success, chart:[{interv,value,height?}]}`; SQL average of stored difficulty per time bucket. |
| `queryStatsGuesserChartData` | `GET /api/trend/fee?duration=...` | `{success, chart:[{interv,value,height?}]}`; SQL sum of fees per time bucket. |
| `queryStatsRewardChartData` | `GET /api/trend/reward?duration=...` | `{success, chart:[{interv,value,fee,height?}]}`; SQL sums of coinbase amount and fee. |
| `queryTransactions` | `GET /api/tx/list?page={page}&pageSize={size}` | Transaction list; note the camel-case `pageSize` differs from block pagination. |
| `queryTransactionByBlock` | `GET /api/transaction/by_height/{height}` | `{success, txs}` from the explorer database. |
| `querySearchApi` | `GET /api/search?q={searchValue}` | Search contract; semantics still require verification. |
| `queryMinerStat`, `queryMinerBlocks` | `GET /api/miner/stat/{digest}`, `GET /api/miner/blocks/{digest}?page={page}&page_size={size}` | Miner-specific database views, not an authoritative network hashrate source. |

The backend separately registers `GET /api/block/ws` and exposes an OpenAPI
SSE route `GET /api/block/event`. The checked-in frontend uses the WebSocket.
The OpenAPI SSE example emits an event named `blocks` with height, timestamp,
inputs and outputs, but this is a contract example, not a live capture.

The backend mounts generated routes below `/api`, returns
`{success:false,message:...}` for handler errors, enables wildcard CORS with
credentials, and listens internally on `0.0.0.0:8080`. These are source facts,
not production deployment facts.

## Calculation and storage behavior

- `/api/overview` selects the highest stored block, reads persisted total reward
  and fee sums, counts UTXOs and transactions, and computes the recent work
  rate and average block time from the latest block and the block at
  `latest_height - 144` (or a shorter distance on a short chain).
- `network_speed_24h` is cumulative-work delta divided by timestamp delta. It is
  a work-rate estimate, not verified conventional hashes/second.
- Target trend uses `avg(difficulty)`. Reward trend uses
  `sum(coinbase_amount)` and `sum(fee)`. Fee trend uses `sum(fee)`.
- Block pagination defaults to 10 and is capped at 100 in the Go handler.
- The API is backed by PostgreSQL/TimescaleDB and therefore provides historical
  data only as retained by that deployment. Canonical and orphaned rows are
  handled by separate scopes.

## Node RPC sources

The older Go explorer client uses REST-like upstream calls including
`/rpc/block_info/tip`, `/rpc/block_info/height_or_digest/{height_or_hash}`,
`/rpc/utxo_digest/{index}`, and mempool routes. The current xnt-core JSON-RPC
trait includes `network`, `height`, `tip_digest`, `tip`, `tip_header`,
`get_block`, `get_block_header`, `block_info`, and `get_blocks`. Its integration
test uses `tip` and shows archival `get_block` is unavailable by default.
Request and result serialization must be captured from the exact deployed
xnt-core revision before implementing a client.

The separate Rust `xnt-explorer` exposes candidate supply routes
`/rpc/circulating_supply` and `/rpc/total_supply`. Both query the connected
xnt-core height and calculate whole-coin values locally from a premine plus
completed/current-generation subsidy. The source comments assume old-chain
redemption claims have been rewarded. Its RPC wrapper also has a `MOCK`
fallback that can return imagined deterministic block data after an RPC
failure. It is a different service and must not be used for live statistics
unless its deployment, response schema, supply assumptions and mock setting are
verified.

## xnt-core network identity facts

The current xnt-core source defines `Network::Main` (id `0`), testnet-mock,
regtest and numbered testnets. It documents mainnet's five-minute target block
interval, 60-second minimum block time, and no difficulty reset; test networks
have different rules. The source defines mainnet launch timestamp
`1764288000000`, genesis difficulty limbs
`[100_000_000, 0, 0, 0, 0]`, and a source-level block-0 digest expectation
`3b012c9abf353d9201bc3328391bbd0d43c5edb91da1085be15a3fc52ad55f65ea115d255922b5a4`.
These are constants and test expectations in the current repository, not proof
that the public explorer is connected to that revision or network. The digest
has not been checked against a live public RPC.

Current source-level monetary constants also include 8,640 blocks per
generation, a one-XNT tail subsidy from generation 72, and a 1,942,384-XNT
premine. These conflict with stale tokenomics copy in the checked-in frontend;
the bot must not select between them without live-network and revision
verification.

## Public URL probes

| UTC check date | URL | Result | Interpretation |
|---|---|---|---|
| 2026-10-12 | `https://neptunescan.io/` | HTTP success; HTML identifies the Neptune Privacy Explorer | Site responds; same-origin API is not established. |
| 2026-10-12 | `https://neptunescan.io/api/overview` | HTTP 404 | Candidate path is not served at this host/path. |
| 2026-10-12 | `https://neptunescan.io/api/swagger.json` | HTTP 404 | Candidate Swagger path is not served at this host/path. |
| 2026-10-12 | `https://api.neptunescan.io/api/block/92031` | HTTP 200; JSON `success: true` | Block-detail endpoint is reachable and returned the observed response shape only; identity, freshness, and reliability remain unverified. |
| 2026-10-12 | `https://api.neptunescan.io/api/overview` | HTTP 200; JSON `success: false` | Reachable but not a successful metric response; not used by the bot. |
| 2026-10-12 | `https://api.neptunescan.io/api/swagger.json` | Separately observed to work | API-subdomain result is distinct from the same-origin 404. |

The checked-in frontend defaults are `https://neptune.vxb.ai`,
`wss://neptune.vxb.ai/api/block/ws`, and
`https://neptune.vxb.ai/api/swagger.json`. They are repository defaults, not
live verification. A block-detail response was captured from the separate API
subdomain, but no successful live metric response or genesis identifier was
established in this pass.

## Historical-data decision

Historical data is present in the explorer's TimescaleDB and could be reused
for charts and aggregates if a verified API deployment is found. Before reuse,
measure freshness, reorg handling, canonical/orphan semantics, retention and
rate limits. Use API reuse with a small bot cache before operating an indexer;
operate an independent node/indexer only when reliable historical access or
independent verification is required.

## Required pre-implementation fixtures

Capture redacted fixtures for overview, a tip/block lookup, each trend
duration, one WebSocket event and one current xnt-core JSON-RPC response.
Every fixture must record method, exact URL, UTC time, status, content type and
whether it came from a live service or a pinned local node. Never store
authorization headers or secrets.
