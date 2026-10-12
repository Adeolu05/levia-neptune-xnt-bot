import { MAX_BLOCKS_PAGE_SIZE, type BlockSummary, type NetworkStatsSource } from './provider.js';

/** Same window NeptuneScan uses for its `network_speed_24h` figure. */
export const HASHRATE_WINDOW_BLOCKS = 144;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
export const HISTORY_DAYS = 7;
/** Safety cap: ~4,000 blocks is far more than 7 days plus one window. */
const MAX_PAGES = 40;
const PARALLEL_PAGES = 4;
/** A comparison point must lie within this distance of its target time. */
const COMPARISON_TOLERANCE_MS = 3 * HOUR_MS;
const CHART_POINT_SPACING_BLOCKS = 3;

export type HashratePoint = {
  height: number;
  timeMs: number;
  /** Estimated hashes per second over the 144 blocks ending at `height`. */
  hashrate: bigint;
};

export type NetworkReport = {
  height: number;
  difficulty: bigint;
  circulatingSupplyBaseUnits: bigint;
  hashrate: bigint;
  hashrate24hAgo?: bigint | undefined;
  hashrate7dAgo?: bigint | undefined;
  /** Hashrate over the last 7 days, oldest first, for charting. */
  history: HashratePoint[];
};

export class NetworkStatsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'NetworkStatsError';
  }
}

/**
 * Fetches newest-first block pages until the list reaches `HASHRATE_WINDOW_BLOCKS`
 * blocks older than `HISTORY_DAYS` before the tip. Returns blocks oldest first,
 * de-duplicated (a new block can shift pages between requests) and verified to
 * have no height gaps.
 */
export async function loadRecentBlocks(source: NetworkStatsSource): Promise<BlockSummary[]> {
  const byHeight = new Map<number, BlockSummary>();
  let sinceMs: number | undefined;

  const enough = (): boolean => {
    if (sinceMs === undefined) {
      return false;
    }
    let older = 0;
    for (const block of byHeight.values()) {
      if (block.timeMs < sinceMs) {
        older += 1;
      }
    }
    return older >= HASHRATE_WINDOW_BLOCKS;
  };

  for (let page = 0; page < MAX_PAGES && !enough(); page += PARALLEL_PAGES) {
    const pages = Array.from(
      { length: Math.min(PARALLEL_PAGES, MAX_PAGES - page) },
      (_, offset) => page + offset,
    );
    const results = await Promise.all(
      pages.map((index) => source.getBlocksPage(index, MAX_BLOCKS_PAGE_SIZE)),
    );
    let reachedGenesis = false;
    for (const blocks of results) {
      for (const block of blocks) {
        byHeight.set(block.height, block);
      }
      if (blocks.length < MAX_BLOCKS_PAGE_SIZE) {
        reachedGenesis = true;
      }
    }
    if (sinceMs === undefined) {
      const tip = results[0]?.[0];
      if (tip === undefined) {
        throw new NetworkStatsError('The explorer returned no blocks.');
      }
      sinceMs = tip.timeMs - HISTORY_DAYS * DAY_MS;
    }
    if (reachedGenesis) {
      break;
    }
  }

  const blocks = [...byHeight.values()].sort((a, b) => a.height - b.height);
  for (let index = 1; index < blocks.length; index += 1) {
    const previous = blocks[index - 1] as BlockSummary;
    const current = blocks[index] as BlockSummary;
    if (current.height !== previous.height + 1 || current.timeMs <= previous.timeMs) {
      throw new NetworkStatsError('The explorer block list is not contiguous.');
    }
  }
  return blocks;
}

/**
 * Rolling 144-block hashrate for every block that has a full window behind it.
 * Cumulative proof-of-work advances by each block's predecessor difficulty, so
 * the work over blocks (h-144, h] is the sum of difficulties of blocks
 * [h-144, h-1]. This reproduces NeptuneScan's `network_speed_24h` exactly
 * (verified against `/api/rpc/block` cumulative work on 2026-10-12).
 */
export function rollingHashrate(blocks: BlockSummary[]): HashratePoint[] {
  const prefix: bigint[] = [0n];
  for (const block of blocks) {
    prefix.push((prefix.at(-1) as bigint) + block.difficulty);
  }

  const points: HashratePoint[] = [];
  for (let index = HASHRATE_WINDOW_BLOCKS; index < blocks.length; index += 1) {
    const newest = blocks[index] as BlockSummary;
    const oldest = blocks[index - HASHRATE_WINDOW_BLOCKS] as BlockSummary;
    const work = (prefix[index] as bigint) - (prefix[index - HASHRATE_WINDOW_BLOCKS] as bigint);
    const elapsedMs = newest.timeMs - oldest.timeMs;
    points.push({
      height: newest.height,
      timeMs: newest.timeMs,
      hashrate: (work * 1000n) / BigInt(elapsedMs),
    });
  }
  return points;
}

function pointNear(points: HashratePoint[], targetMs: number): HashratePoint | undefined {
  let best: HashratePoint | undefined;
  for (const point of points) {
    if (
      best === undefined ||
      Math.abs(point.timeMs - targetMs) < Math.abs(best.timeMs - targetMs)
    ) {
      best = point;
    }
  }
  return best !== undefined && Math.abs(best.timeMs - targetMs) <= COMPARISON_TOLERANCE_MS
    ? best
    : undefined;
}

export async function getNetworkReport(source: NetworkStatsSource): Promise<NetworkReport> {
  const [overview, blocks] = await Promise.all([source.getOverview(), loadRecentBlocks(source)]);
  const points = rollingHashrate(blocks);
  const latest = points.at(-1);
  const tip = blocks.at(-1);
  if (latest === undefined || tip === undefined) {
    throw new NetworkStatsError('Not enough chain history for a hashrate window.');
  }

  const historyStart = latest.timeMs - HISTORY_DAYS * DAY_MS;
  const history = points.filter(
    (point, index) =>
      point.timeMs >= historyStart &&
      (index % CHART_POINT_SPACING_BLOCKS === 0 || point === latest),
  );

  return {
    height: tip.height,
    difficulty: tip.difficulty,
    circulatingSupplyBaseUnits: overview.circulatingSupplyBaseUnits,
    hashrate: latest.hashrate,
    hashrate24hAgo: pointNear(points, latest.timeMs - DAY_MS)?.hashrate,
    hashrate7dAgo: pointNear(points, historyStart)?.hashrate,
    history,
  };
}
