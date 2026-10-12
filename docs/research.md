# Neptune Privacy / NeptuneScan research

Research date: 2026-10-12. This document records checked sources, not assumptions.

## Scope and sources

Inspected:

- [NeptuneScan explorer repository](https://github.com/neptuneprivacy/neptunescan-explorer), including its OpenAPI file, Go handlers, models, frontend environment examples, Docker configuration, and RPC client.
- [Current xnt-core repository](https://github.com/neptuneprivacy/xnt-core), including the block and mining documentation and the JSON-RPC HTTP client.
- [Current live explorer](https://neptunescan.io/), including its HTML/Next.js assets and public URL probes.
- [Telegram Bot API](https://core.telegram.org/bots/api) and [grammY documentation](https://grammy.dev/).

The local repository was empty, so no existing bot conventions or implementation were present.

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

`https://neptunescan.io/` currently serves a Next.js “Neptune Privacy Explorer” page and includes a visible API navigation item. Direct probes of `/api`, `/api/overview`, `/api/blocks?page=0&page_size=1`, `/api/trend/target?duration=day`, `/api/trend/reward?duration=day`, `/api/swagger.json`, and `/api/block/ws` returned HTTP 404 from the live host during this research.

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

## Sample-response rule

No live API response was captured because the public paths above returned 404. The implementation must not ship copied or fabricated samples. A pre-implementation verification task must capture redacted JSON fixtures from the verified live API and record the request URL, UTC timestamp, response status, and node/explorer revision.
