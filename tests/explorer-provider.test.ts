import { describe, expect, it, vi } from 'vitest';
import { NeptuneScanProvider, type FetchLike } from '../src/neptune/provider.js';

function response(body: unknown, status = 200): Awaited<ReturnType<FetchLike>> {
  return { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(body) };
}

// Trimmed from https://api.neptunescan.io/api/overview, captured 2026-10-12.
const OVERVIEW = {
  message: '',
  overview: {
    average_block_time: 315.2028,
    height: 92051,
    network_speed_24h: '1147874360',
    proof_target: '271865533734',
    total_reward: '2504042784368000000000000000000000000',
    tx_count: 12314,
  },
  success: false,
};

// Trimmed from https://api.neptunescan.io/api/blocks?page=0&page_size=2, captured 2026-10-12.
const BLOCKS_PAGE = {
  blocks: [
    {
      block: 92051,
      block_hash: 'd0389d6b',
      coinbase_reward: '5356364000000000000000000000000',
      proof_target: '271865533734',
      time: '2026-10-13T00:24:39.163+08:00',
    },
    {
      block: 92050,
      block_hash: 'bf2151b2',
      coinbase_reward: '5356364000000000000000000000000',
      proof_target: '267697314325',
      time: '2026-10-13T00:20:53.905+08:00',
    },
  ],
  count: 92052,
  message: '',
  success: true,
};

function provider(body: unknown, status = 200) {
  const fetcher: FetchLike = vi.fn().mockResolvedValue(response(body, status));
  return { fetcher, explorer: new NeptuneScanProvider('https://api.neptunescan.io/', fetcher) };
}

describe('NeptuneScanProvider overview', () => {
  it('accepts the live overview payload even though it reports success: false', async () => {
    const { fetcher, explorer } = provider(OVERVIEW);

    await expect(explorer.getOverview()).resolves.toEqual({
      height: 92051,
      difficulty: 271865533734n,
      circulatingSupplyBaseUnits: 2504042784368000000000000000000000000n,
      averageBlockTimeSeconds: 315.2028,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.neptunescan.io/api/overview',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('reports an API failure when the overview payload is missing', async () => {
    const { explorer } = provider({ success: false, message: 'not ready' });
    await expect(explorer.getOverview()).rejects.toMatchObject({ reason: 'api' });
  });

  it('rejects non-integer numeric strings', async () => {
    const { explorer } = provider({
      ...OVERVIEW,
      overview: { ...OVERVIEW.overview, total_reward: '2.5e36' },
    });
    await expect(explorer.getOverview()).rejects.toMatchObject({ reason: 'schema' });
  });
});

describe('NeptuneScanProvider block list', () => {
  it('maps a block page with exact difficulty and UTC time', async () => {
    const { fetcher, explorer } = provider(BLOCKS_PAGE);

    await expect(explorer.getBlocksPage(0, 2)).resolves.toEqual([
      {
        height: 92051,
        difficulty: 271865533734n,
        timeMs: Date.parse('2026-10-12T16:24:39.163Z'),
      },
      {
        height: 92050,
        difficulty: 267697314325n,
        timeMs: Date.parse('2026-10-12T16:20:53.905Z'),
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.neptunescan.io/api/blocks?page=0&page_size=2',
      expect.anything(),
    );
  });

  it.each([
    ['a decimal difficulty', { ...BLOCKS_PAGE.blocks[0], proof_target: '1.5' }],
    ['an invalid time', { ...BLOCKS_PAGE.blocks[0], time: 'soon' }],
  ])('rejects %s', async (_name, block) => {
    const { explorer } = provider({ ...BLOCKS_PAGE, blocks: [block] });
    await expect(explorer.getBlocksPage(0, 1)).rejects.toMatchObject({ reason: 'schema' });
  });

  it('refuses page sizes above the explorer limit', async () => {
    const { fetcher, explorer } = provider(BLOCKS_PAGE);
    await expect(explorer.getBlocksPage(0, 101)).rejects.toThrow(RangeError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces HTTP errors', async () => {
    const { explorer } = provider({}, 502);
    await expect(explorer.getBlocksPage(0, 100)).rejects.toMatchObject({
      reason: 'http',
      service: 'neptunescan',
    });
  });
});
