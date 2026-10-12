import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../src/http.js';
import { CoinGeckoPriceProvider } from '../src/market/coingecko.js';

function fetcherFor(body: unknown, status = 200): FetchLike {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
}

describe('CoinGeckoPriceProvider', () => {
  it('reads the XNT USD price and 24h change', async () => {
    // Captured from CoinGecko /simple/price on 2026-10-12.
    const fetcher = fetcherFor({
      'neptune-privacy': {
        usd: 0.654119,
        usd_24h_change: 50.75279442957521,
        last_updated_at: 1791822524,
      },
    });

    await expect(new CoinGeckoPriceProvider(fetcher).getPrice()).resolves.toEqual({
      usd: 0.654119,
      change24hPercent: 50.75279442957521,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=neptune-privacy&vs_currencies=usd&include_24hr_change=true',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('omits a missing 24h change', async () => {
    const provider = new CoinGeckoPriceProvider(
      fetcherFor({ 'neptune-privacy': { usd: 0.5, usd_24h_change: null } }),
    );
    await expect(provider.getPrice()).resolves.toEqual({ usd: 0.5 });
  });

  it.each([
    ['an empty response', {}],
    ['a zero price', { 'neptune-privacy': { usd: 0 } }],
  ])('rejects %s', async (_name, body) => {
    await expect(new CoinGeckoPriceProvider(fetcherFor(body)).getPrice()).rejects.toMatchObject({
      reason: 'schema',
      service: 'coingecko',
    });
  });

  it('reports rate limiting as an HTTP error', async () => {
    await expect(new CoinGeckoPriceProvider(fetcherFor({}, 429)).getPrice()).rejects.toMatchObject({
      reason: 'http',
      service: 'coingecko',
    });
  });

  it('reads and sorts the 7-day price history', async () => {
    const fetcher = fetcherFor({
      prices: [
        [1791823300000, 0.64207],
        [1791219600000, 0.28842],
      ],
      market_caps: [],
      total_volumes: [],
    });

    await expect(new CoinGeckoPriceProvider(fetcher).getPriceHistory(7)).resolves.toEqual([
      { timeMs: 1791219600000, usd: 0.28842 },
      { timeMs: 1791823300000, usd: 0.64207 },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/coins/neptune-privacy/market_chart?vs_currency=usd&days=7',
      expect.anything(),
    );
  });

  it('rejects a history with fewer than two points', async () => {
    await expect(
      new CoinGeckoPriceProvider(fetcherFor({ prices: [[1, 0.5]] })).getPriceHistory(7),
    ).rejects.toMatchObject({ reason: 'schema' });
  });
});
