import { z } from 'zod';
import { getJson, UpstreamError, type FetchLike } from '../http.js';

/**
 * CoinGecko's id for Neptune Privacy (XNT). Verified on 2026-10-12: the
 * listing links to https://neptune.io/ and https://neptunescan.io/.
 */
export const COINGECKO_COIN_ID = 'neptune-privacy';
export const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

const priceResponseSchema = z.object({
  [COINGECKO_COIN_ID]: z.object({
    usd: z.number().positive(),
    usd_24h_change: z.number().nullable().optional(),
  }),
});

const marketChartSchema = z.object({
  prices: z.array(z.tuple([z.number().int().positive(), z.number().positive()])).min(2),
});

export type PricePoint = {
  timeMs: number;
  usd: number;
};

export type MarketPrice = {
  usd: number;
  change24hPercent?: number;
};

export type PriceProvider = {
  getPrice(): Promise<MarketPrice>;
  getPriceHistory(days: number): Promise<PricePoint[]>;
};

export class CoinGeckoPriceProvider implements PriceProvider {
  public constructor(
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
    private readonly baseUrl = COINGECKO_API_BASE_URL,
  ) {}

  public async getPrice(): Promise<MarketPrice> {
    const body = await getJson(
      `${this.baseUrl}/simple/price?ids=${COINGECKO_COIN_ID}&vs_currencies=usd&include_24hr_change=true`,
      { fetcher: this.fetcher, timeoutMs: this.timeoutMs, service: 'coingecko' },
    );
    const parsed = priceResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError(
        'The price service returned an invalid response.',
        'schema',
        'coingecko',
      );
    }
    const quote = parsed.data[COINGECKO_COIN_ID];
    return {
      usd: quote.usd,
      ...(typeof quote.usd_24h_change === 'number'
        ? { change24hPercent: quote.usd_24h_change }
        : {}),
    };
  }

  /** USD price history; CoinGecko returns hourly points for 2–90 day ranges. */
  public async getPriceHistory(days: number): Promise<PricePoint[]> {
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      throw new RangeError('days must be an integer between 1 and 90');
    }
    const body = await getJson(
      `${this.baseUrl}/coins/${COINGECKO_COIN_ID}/market_chart?vs_currency=usd&days=${days}`,
      { fetcher: this.fetcher, timeoutMs: this.timeoutMs, service: 'coingecko' },
    );
    const parsed = marketChartSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError(
        'The price service returned an invalid price history.',
        'schema',
        'coingecko',
      );
    }
    return parsed.data.prices
      .map(([timeMs, usd]) => ({ timeMs, usd }))
      .sort((a, b) => a.timeMs - b.timeMs);
  }
}
