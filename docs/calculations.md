# Calculations and semantics

## Height and latest block

The explorer overview selects the highest stored block height. A node tip is authoritative for current chain state; an explorer overview is authoritative only for the explorer's indexed view. Compare both when possible and expose a “data delayed” state if they diverge.

## Network speed / hashrate

The checked-in explorer computes:

```text
work_delta = cumulative_work(latest) - cumulative_work(block at latest_height - dist)
seconds = latest_timestamp - old_timestamp
network_speed_24h = floor(work_delta / seconds)
```

`dist` is 144 unless the chain is shorter. The displayed `average_block_time` is:

```text
(latest_timestamp - old_timestamp) / (dist - 1)
```

This is a work-rate estimate over the most recent approximately 144-block window. The source calls it `network_speed_24h`; it is not proof that the value is a conventional SHA-256-style hashes/second measurement. Unit labels must remain “work units per second” until xnt-core defines the numeric work unit and the live API confirms formatting.

## Difficulty

xnt-core documents difficulty as an approximate number of hashes required to find a block. In consensus validation, the current block's difficulty is checked against the difficulty-control algorithm and cumulative work advances by the predecessor's difficulty. The explorer's target trend is not “the difficulty formula”; it is the time-bucketed average of database `difficulty`.

Do not convert `difficulty` to a target probability or hashrate without verifying the xnt-core difficulty-control implementation and numeric representation for the deployed network.

## Timestamps and averages

xnt-core says a block timestamp is when the block was found, with a minimum interval of 60 seconds and a five-minute future-dating limit. The explorer stores timestamps as SQL time values and returns RFC/JSON time values depending on endpoint. Calculate elapsed seconds in UTC and reject negative or zero intervals.

## Rewards and emission

The explorer exposes:

- `coinbase_amount` per block;
- `day_reward`, the sum of canonical coinbase amounts over the last 24 hours;
- `total_reward`, a persisted sum from the explorer database;
- reward chart `value`, the sum of coinbase amounts per time bucket;
- fees separately from subsidy in chart/overview fields.

xnt-core mining documentation says block reward is subsidy plus transaction fees, with an initial subsidy of 128 and halving constants documented there. Because the documentation also describes a rebooted/legacy-network transition, the bot must treat current circulating supply, total supply, and future emission as UNVERIFIED until source constants and live genesis/network identity are pinned.

Do not call `coinbase_amount` alone “total reward” when fees are included in the product definition. Keep `subsidy`, `fees`, and `coinbase_amount` distinct.

## Supply

No checked-in explorer endpoint or model field confirms circulating supply or total supply. A bot may report supply only after one of these is verified:

1. an official API/RPC field with documented semantics;
2. a reproducible sum over canonical UTXOs with a verified treatment of timelocks, burned/unspendable outputs, and reorgs;
3. an official tokenomics source tied to the active network.

Until then, display “not available” rather than estimate.

## Precision and validation

Large work, reward, fee, and difficulty values must be represented as decimal strings or arbitrary-precision integers. Validate:

- height is a non-negative integer;
- timestamps are parseable and monotonic for adjacent canonical blocks;
- cumulative work does not decrease on a canonical chain;
- difficulty and reward are non-negative;
- denominators are positive;
- API `success` is true before reading payload fields;
- canonical and orphaned blocks are not mixed in aggregates.

