import { z } from 'zod';

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

const blockFailureSchema = z.object({
  success: z.literal(false),
  message: z.string().optional(),
});

export type BlockDetails = {
  height: number;
  hash: string;
  timestamp: string;
  target: string;
  isCanonical: boolean;
};

export type NeptuneDataProvider = {
  getBlock(height: number): Promise<BlockDetails>;
};

export class BlockLookupError extends Error {
  public constructor(
    message: string,
    public readonly reason: 'timeout' | 'network' | 'http' | 'invalid-json' | 'api' | 'schema',
  ) {
    super(message);
    this.name = 'BlockLookupError';
  }
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export class NeptuneScanProvider implements NeptuneDataProvider {
  private readonly baseUrl: string;

  public constructor(
    baseUrl: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async getBlock(height: number): Promise<BlockDetails> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(`${this.baseUrl}/api/block/${height}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new BlockLookupError(`The explorer returned HTTP ${response.status}.`, 'http');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new BlockLookupError('The explorer returned invalid JSON.', 'invalid-json');
      }

      const failure = blockFailureSchema.safeParse(body);
      if (failure.success) {
        throw new BlockLookupError(
          failure.data.message ?? 'The explorer could not find that block.',
          'api',
        );
      }

      const parsed = blockResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.detail.block !== height) {
        throw new BlockLookupError('The explorer returned an invalid block response.', 'schema');
      }

      return {
        height: parsed.data.detail.block,
        hash: parsed.data.detail.block_hash,
        timestamp: parsed.data.detail.time,
        target: parsed.data.detail.target,
        isCanonical: parsed.data.detail.is_canonical,
      };
    } catch (error) {
      if (error instanceof BlockLookupError) {
        throw error;
      }
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new BlockLookupError('The explorer request timed out.', 'timeout');
      }
      throw new BlockLookupError('The explorer request failed.', 'network');
    } finally {
      clearTimeout(timeout);
    }
  }
}
