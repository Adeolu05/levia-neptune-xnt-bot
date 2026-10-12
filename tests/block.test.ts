import { describe, expect, it, vi } from 'vitest';
import { UpstreamError, NeptuneScanProvider, type FetchLike } from '../src/neptune/provider.js';

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('NeptuneScanProvider block detail', () => {
  it('validates and maps a successful explorer response', async () => {
    const fetcher: FetchLike = vi.fn().mockResolvedValue(
      response({
        success: true,
        detail: {
          block: 92031,
          block_hash: 'block-hash',
          time: '2026-10-12T12:00:00Z',
          target: '18446744073709551616',
          is_canonical: true,
        },
      }),
    );
    const provider = new NeptuneScanProvider('https://api.neptunescan.io/', fetcher);

    await expect(provider.getBlock(92031)).resolves.toEqual({
      height: 92031,
      hash: 'block-hash',
      timestamp: '2026-10-12T12:00:00Z',
      target: '18446744073709551616',
      isCanonical: true,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.neptunescan.io/api/block/92031',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it.each([
    ['API failure', { success: false, message: 'not ready' }],
    ['invalid response schema', { success: true, detail: {} }],
  ])('handles %s', async (_name, body) => {
    const fetcher: FetchLike = vi.fn().mockResolvedValue(response(body));
    const provider = new NeptuneScanProvider('https://api.neptunescan.io', fetcher);

    await expect(provider.getBlock(92031)).rejects.toBeInstanceOf(UpstreamError);
  });

  it('rejects a response for a different block height', async () => {
    const fetcher: FetchLike = vi.fn().mockResolvedValue(
      response({
        success: true,
        detail: {
          block: 92030,
          block_hash: 'block-hash',
          time: '2026-10-12T12:00:00Z',
          target: '18446744073709551616',
          is_canonical: true,
        },
      }),
    );
    const provider = new NeptuneScanProvider('https://api.neptunescan.io', fetcher);

    await expect(provider.getBlock(92031)).rejects.toMatchObject({ reason: 'schema' });
  });

  it('handles HTTP errors', async () => {
    const provider = new NeptuneScanProvider(
      'https://api.neptunescan.io',
      vi.fn().mockResolvedValue(response({}, 503)),
    );

    await expect(provider.getBlock(92031)).rejects.toMatchObject({ reason: 'http' });
  });

  it('handles malformed JSON', async () => {
    const fetcher: FetchLike = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
    });
    const provider = new NeptuneScanProvider('https://api.neptunescan.io', fetcher);

    await expect(provider.getBlock(92031)).rejects.toMatchObject({ reason: 'invalid-json' });
  });

  it('handles network failures', async () => {
    const networkProvider = new NeptuneScanProvider(
      'https://api.neptunescan.io',
      vi.fn().mockRejectedValue(new Error('offline')),
    );

    await expect(networkProvider.getBlock(92031)).rejects.toMatchObject({ reason: 'network' });
  });

  it('classifies a request that hangs until aborted as a timeout', async () => {
    const fetcher: FetchLike = vi.fn().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('request aborted'));
          });
        }),
    );
    const timeoutProvider = new NeptuneScanProvider('https://api.neptunescan.io', fetcher, 10);

    await expect(timeoutProvider.getBlock(92031)).rejects.toMatchObject({ reason: 'timeout' });
  });
});
