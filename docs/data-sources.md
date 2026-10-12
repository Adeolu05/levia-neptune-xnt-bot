# Data sources and endpoint inventory

All paths below are from the checked-in NeptuneScan OpenAPI contract and are prefixed by `/api` by the Go server. They are not confirmed live endpoints.

## Explorer API

| Purpose | Endpoint | Response/source | Authority and limitations |
|---|---|---|---|
| Overview/latest block | `GET /api/overview` | `overview` with `height`, `block_hash`, `timestamp`, `proof_target`, `cumulative_proof_of_work`, `network_speed_24h`, `average_block_time`, `total_reward`, `day_reward`, `total_fee`, `day_fee`, counts | Calculated/aggregated from the explorer DB. Latest stored block, not necessarily a live node tip if ingestion lags. |
| Canonical block list | `GET /api/blocks?page={page}&page_size={page_size}` | Canonical blocks with height, hash, reward, fee, inputs, outputs, proof target, time | DB-backed; page size is capped at 100 by handler. |
| Block detail | `GET /api/block/{height}` | Canonical flag, height, hash, reward, fee, difficulty, time | DB-backed; missing blocks produce an error response. |
| Node block lookup | `GET /api/rpc/block/{height_or_hash}` | Converted node RPC block | Direct node lookup through the explorer's configured RPC. The explorer source calls `/rpc/block_info/height_or_digest/{height_or_hash}`. |
| Difficulty history | `GET /api/trend/target?duration=all|month|week|day` | `{success, chart:[{interv,value,height}]}` | `value` is SQL `avg(difficulty)` in time buckets; not a raw per-block difficulty series. |
| Reward history | `GET /api/trend/reward?duration=all|month|week|day` | `{success, chart:[{interv,value,fee,height}]}` | `value` is sum of `coinbase_amount`; `fee` is sum of fees in each bucket. |
| Fee history | `GET /api/trend/fee?...` | `{success, chart:[{interv,value,height}]}` | Sum of fees in each bucket. |
| Blocks WebSocket | `GET/upgrade /api/block/ws` | Source registers a WebSocket handler | Exact event JSON and reconnect semantics require inspecting the deployed handler/runtime; do not assume event names. |
| Mempool | `GET /api/block/mempool` and block/mempool subscription | OpenAPI route plus source subscription goroutine | Exact freshness and event schema require live verification. |
| Swagger | `GET /api/swagger.json` | OpenAPI JSON in contract | The checked-in live host returned 404; current deployment may have moved/removed it. |

## Node RPC sources

The older explorer RPC client uses:

- `/rpc/block_info/tip` for the current tip;
- `/rpc/block_info/height_or_digest/{height_or_hash}` for a block;
- `/rpc/utxo_digest/{index}` for an indexed UTXO digest;
- `/rpc/mempool/0/1000` for mempool transactions;
- `/rpc/mempool/events?txid={txid}` for transaction events.

The current xnt-core client uses JSON-RPC 2.0 POST requests and calls `tip`; its test calls `get_block` through an archival selector and expects `MethodNotFound` when archival mode is disabled. The exact current RPC API must be read from the pinned xnt-core revision before writing a client.

The separate Rust [xnt-explorer](https://github.com/neptuneprivacy/xnt-explorer) registers `/rpc/circulating_supply` and `/rpc/total_supply` in addition to block and UTXO REST façades. These endpoints are candidates for supply research only; they are not proven to back the live NeptuneScan deployment, and their response schemas must be captured from a verified service.

## Verified model fields

The checked-in explorer model maps an RPC block to:

`height`, `digest`, `prev_block_digest`, `nonce`, `timestamp`, `cumulative_proof_of_work`, `difficulty`, `num_inputs`, `num_outputs`, `inputs`, `outputs`, `guesser_fee_utxo_digests`, `num_public_announcements`, `coinbase_amount`, `fee`, `is_genesis`, `is_tip`, `is_canonical`, `sibling_blocks`, and `guesser_digest`.

The old REST model serializes cumulative work and difficulty as arrays of `uint32` limbs, while the database/API model serializes large numeric values as strings. The bot should preserve strings/decimal big integers and never parse these into JavaScript `number`.

## Historical-data decision

Historical data already exists in the explorer's TimescaleDB if the public API is available. It is reusable for charts and recent aggregates, but it is not independently authoritative until:

1. the API is reachable;
2. its ingestion lag and reorg handling are measured;
3. canonical/orphan semantics are confirmed;
4. retention and rate limits are known.

If those checks pass, start with API reuse and a small bot cache. Run an independent indexer/full node only when the operator cannot provide reliable historical access, when long-term retention is required, or when independent verification is a product requirement.

## Required capture fixture

Before implementation, save redacted fixtures under `docs/fixtures/` for:

- overview;
- one tip/block lookup;
- target trend for each supported duration;
- reward trend;
- one WebSocket block event;
- one current xnt-core JSON-RPC response.

Each fixture must include source URL/method, UTC capture time, status code, and a note identifying whether it came from the live explorer or a pinned local node. No secrets or authorization headers belong in fixtures.
