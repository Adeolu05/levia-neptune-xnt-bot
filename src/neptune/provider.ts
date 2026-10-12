import { z } from 'zod';
import { getJson, UpstreamError, type FetchLike } from '../http.js';
import { isIntegerString } from './units.js';

export { UpstreamError, type FetchLike } from '../http.js';

const integerString = z.string().refine(isIntegerString, 'Expected a non-negative integer string');

const failureSchema = z.object({
  success: z.literal(false),
  message: z.string().optional(),
});

const blockResponseSchema = z.object({
  success: z.literal(true),
  detail: z.object({
    block: z.number().int().nonnegative(),
    block_hash: z.string().min(1),
    time: z.string().min(1),
    target: z.string().min(1),
    is_canonical: z.boolean(),
  }),
});

/**
 * Observed on 2026-10-12: `/api/overview` returns a fully populated `overview`
 * object together with `success: false`, and the live explorer UI displays
 * those values regardless. The payload is therefore validated on its own
 * fields rather than on the `success` flag.
 */
const overviewResponseSchema = z.object({
  overview: z.object({
    height: z.number().int().nonnegative(),
    proof_target: integerString,
    total_reward: integerString,
    network_speed_24h: integerString,
    average_block_time: z.number().positive(),
  }),
});

const blocksPageSchema = z.object({
  success: z.literal(true),
  blocks: z.array(
    z.object({
      block: z.number().int().nonnegative(),
      proof_target: integerString,
      time: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid timestamp'),
    }),
  ),
});

export type BlockDetails = {
  height: number;
  hash: string;
  timestamp: string;
  target: string;
  isCanonical: boolean;
};

export type NetworkOverview = {
  height: number;
  /** Difficulty of the latest indexed block. */
  difficulty: bigint;
  /** Explorer "circulating supply": the sum of all coinbase rewards, in base units. */
  circulatingSupplyBaseUnits: bigint;
  averageBlockTimeSeconds: number;
};

/** A canonical block from the explorer's block list. */
export type BlockSummary = {
  height: number;
  /** Proof-of-work difficulty (approximate number of hashes needed to find the block). */
  difficulty: bigint;
  timeMs: number;
};

export type NeptuneDataProvider = {
  getBlock(height: number): Promise<BlockDetails>;
};

export type NetworkStatsSource = {
  getOverview(): Promise<NetworkOverview>;
  /** Canonical blocks, newest first. Page 0 is the latest page. */
  getBlocksPage(page: number, pageSize: number): Promise<BlockSummary[]>;
};

/** Maximum page size accepted by NeptuneScan's `/api/blocks` route. */
export const MAX_BLOCKS_PAGE_SIZE = 100;

function apiFailure(body: unknown, fallback: string): UpstreamError | undefined {
  const failure = failureSchema.safeParse(body);
  return failure.success
    ? new UpstreamError(failure.data.message || fallback, 'api', 'neptunescan')
    : undefined;
}

function schemaError(what: string): UpstreamError {
  return new UpstreamError(
    `The explorer returned an invalid ${what} response.`,
    'schema',
    'neptunescan',
  );
}

export class NeptuneScanProvider implements NeptuneDataProvider, NetworkStatsSource {
  private readonly baseUrl: string;

  public constructor(
    baseUrl: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private request(path: string): Promise<unknown> {
    return getJson(`${this.baseUrl}${path}`, {
      fetcher: this.fetcher,
      timeoutMs: this.timeoutMs,
      service: 'neptunescan',
    });
  }

  public async getBlock(height: number): Promise<BlockDetails> {
    const body = await this.request(`/api/block/${height}`);
    const failure = apiFailure(body, 'The explorer could not find that block.');
    if (failure) {
      throw failure;
    }

    const parsed = blockResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.detail.block !== height) {
      throw schemaError('block');
    }

    return {
      height: parsed.data.detail.block,
      hash: parsed.data.detail.block_hash,
      timestamp: parsed.data.detail.time,
      target: parsed.data.detail.target,
      isCanonical: parsed.data.detail.is_canonical,
    };
  }

  public async getOverview(): Promise<NetworkOverview> {
    const body = await this.request('/api/overview');
    const parsed = overviewResponseSchema.safeParse(body);
    if (!parsed.success) {
      const hasPayload = typeof body === 'object' && body !== null && 'overview' in body;
      throw hasPayload
        ? schemaError('overview')
        : (apiFailure(body, 'The explorer overview is unavailable.') ?? schemaError('overview'));
    }

    const { overview } = parsed.data;
    return {
      height: overview.height,
      difficulty: BigInt(overview.proof_target),
      circulatingSupplyBaseUnits: BigInt(overview.total_reward),
      averageBlockTimeSeconds: overview.average_block_time,
    };
  }

  public async getBlocksPage(page: number, pageSize: number): Promise<BlockSummary[]> {
    if (!Number.isSafeInteger(page) || page < 0) {
      throw new RangeError('page must be a non-negative integer');
    }
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_BLOCKS_PAGE_SIZE) {
      throw new RangeError(`pageSize must be between 1 and ${MAX_BLOCKS_PAGE_SIZE}`);
    }
    const body = await this.request(`/api/blocks?page=${page}&page_size=${pageSize}`);
    const failure = apiFailure(body, 'The explorer could not list blocks.');
    if (failure) {
      throw failure;
    }

    const parsed = blocksPageSchema.safeParse(body);
    if (!parsed.success) {
      throw schemaError('block list');
    }
    return parsed.data.blocks.map((block) => ({
      height: block.block,
      difficulty: BigInt(block.proof_target),
      timeMs: Date.parse(block.time),
    }));
  }
}
