import { describe, expect, it, vi } from 'vitest';
import {
  getNetworkReport,
  HASHRATE_WINDOW_BLOCKS,
  loadRecentBlocks,
  rollingHashrate,
} from '../src/neptune/network-stats.js';
import type { BlockSummary, NetworkStatsSource } from '../src/neptune/provider.js';

const BLOCK_MS = 300_000;
const SUPPLY = 2504042784368000000000000000000000000n;

/**
 * Synthetic chain with a block every 300 s. Difficulty is 300e9 (1 GH/s)
 * before `stepHeight` and 600e9 (2 GH/s) from it onward.
 */
function chain(tip: number, stepHeight: number): BlockSummary[] {
  return Array.from({ length: tip + 1 }, (_, height) => ({
    height,
    difficulty: height < stepHeight ? 300_000_000_000n : 600_000_000_000n,
    timeMs: height * BLOCK_MS,
  }));
}

function source(blocks: BlockSummary[]): NetworkStatsSource {
  const newestFirst = [...blocks].reverse();
  return {
    getOverview: vi.fn().mockResolvedValue({
      height: blocks.at(-1)?.height ?? 0,
      difficulty: 1n,
      circulatingSupplyBaseUnits: SUPPLY,
      averageBlockTimeSeconds: 300,
    }),
    getBlocksPage: vi.fn((page: number, size: number) =>
      Promise.resolve(newestFirst.slice(page * size, (page + 1) * size)),
    ),
  };
}

describe('rollingHashrate', () => {
  it('matches the explorer formula on captured block 92051', () => {
    // 144 captured difficulties summed to exactly the /api/rpc/block cumulative
    // work delta (51739288942520) over 45,074.118 s on 2026-10-12.
    const blocks: BlockSummary[] = Array.from(
      { length: HASHRATE_WINDOW_BLOCKS + 1 },
      (_, index) => ({
        height: 91907 + index,
        difficulty: index === 0 ? 51739288942520n : 0n,
        timeMs: index === HASHRATE_WINDOW_BLOCKS ? 45_074_118 : index,
      }),
    );

    expect(rollingHashrate(blocks).at(-1)?.hashrate).toBe(1147871355n);
  });

  it('produces one point per block with a full window', () => {
    const points = rollingHashrate(chain(1000, 0));
    expect(points).toHaveLength(1001 - HASHRATE_WINDOW_BLOCKS);
    expect(points.every((point) => point.hashrate === 2_000_000_000n)).toBe(true);
  });
});

describe('loadRecentBlocks', () => {
  it('stops after 7 days plus one window of history', async () => {
    const src = source(chain(5000, 0));
    const blocks = await loadRecentBlocks(src);

    // 7 days = 2016 blocks at 300 s; plus 144 older blocks.
    expect(blocks.at(-1)?.height).toBe(5000);
    expect(blocks[0]?.height).toBeLessThanOrEqual(5000 - 2016 - HASHRATE_WINDOW_BLOCKS);
    expect(vi.mocked(src.getBlocksPage).mock.calls.length).toBeLessThanOrEqual(24);
  });

  it('de-duplicates blocks repeated across pages', async () => {
    const blocks = chain(300, 0);
    const src = source(blocks);
    vi.mocked(src.getBlocksPage).mockImplementation((page, size) => {
      const newestFirst = [...blocks].reverse();
      const start = Math.max(0, page * size - 1);
      return Promise.resolve(newestFirst.slice(start, start + size));
    });

    await expect(loadRecentBlocks(src)).resolves.toHaveLength(301);
  });

  it('rejects a block list with gaps', async () => {
    const blocks = chain(300, 0).filter((block) => block.height !== 150);
    await expect(loadRecentBlocks(source(blocks))).rejects.toThrow('not contiguous');
  });
});

describe('getNetworkReport', () => {
  it('reports current hashrate, 24h and 7d comparisons, and a 7-day history', async () => {
    const report = await getNetworkReport(source(chain(5000, 4000)));

    expect(report.height).toBe(5000);
    expect(report.difficulty).toBe(600_000_000_000n);
    expect(report.circulatingSupplyBaseUnits).toBe(SUPPLY);
    expect(report.hashrate).toBe(2_000_000_000n);
    expect(report.hashrate24hAgo).toBe(2_000_000_000n);
    expect(report.hashrate7dAgo).toBe(1_000_000_000n);
    expect(report.history[0]?.timeMs).toBeGreaterThanOrEqual(5000 * BLOCK_MS - 7 * 86_400_000);
    expect(report.history.at(-1)?.height).toBe(5000);
  });

  it('omits comparisons the chain is too young to provide', async () => {
    const report = await getNetworkReport(source(chain(300, 0)));

    expect(report.hashrate).toBe(2_000_000_000n);
    expect(report.hashrate24hAgo).toBeUndefined();
    expect(report.hashrate7dAgo).toBeUndefined();
  });

  it('fails when there is not enough history for one window', async () => {
    await expect(getNetworkReport(source(chain(100, 0)))).rejects.toThrow(
      'Not enough chain history',
    );
  });
});
