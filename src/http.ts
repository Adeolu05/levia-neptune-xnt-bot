export type UpstreamService = 'neptunescan' | 'coingecko';

export type UpstreamFailureReason =
  'timeout' | 'network' | 'http' | 'invalid-json' | 'api' | 'schema';

export class UpstreamError extends Error {
  public constructor(
    message: string,
    public readonly reason: UpstreamFailureReason,
    public readonly service: UpstreamService,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export type JsonRequestOptions = {
  fetcher: FetchLike;
  timeoutMs: number;
  service: UpstreamService;
  headers?: Record<string, string>;
};

/**
 * Performs a GET request with a timeout and returns the parsed JSON body.
 * Every failure is normalized to an UpstreamError so callers never see raw
 * fetch errors (which could include URLs or headers) in user-facing paths.
 */
export async function getJson(url: string, options: JsonRequestOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const label = options.service === 'neptunescan' ? 'The explorer' : 'The price service';

  try {
    const response = await options.fetcher(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'application/json', ...options.headers },
    });
    if (!response.ok) {
      throw new UpstreamError(
        `${label} returned HTTP ${response.status}.`,
        'http',
        options.service,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new UpstreamError(`${label} returned invalid JSON.`, 'invalid-json', options.service);
    }
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new UpstreamError(`${label} request timed out.`, 'timeout', options.service);
    }
    throw new UpstreamError(`${label} request failed.`, 'network', options.service);
  } finally {
    clearTimeout(timeout);
  }
}
