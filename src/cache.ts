/**
 * Wraps an async loader with a time-to-live cache and in-flight de-duplication,
 * so a busy group chat triggers at most one upstream refresh per TTL window.
 * Failures are never cached. `ttlMs` may depend on the loaded value, e.g. to
 * keep a degraded result for less time than a complete one.
 */
export function cached<T>(
  load: () => Promise<T>,
  ttlMs: number | ((value: T) => number),
  now: () => number = Date.now,
): () => Promise<T> {
  let entry: { value: T; expiresAt: number } | undefined;
  let inFlight: Promise<T> | undefined;

  return async () => {
    if (entry !== undefined && entry.expiresAt > now()) {
      return entry.value;
    }
    if (inFlight === undefined) {
      inFlight = load()
        .then((value) => {
          entry = { value, expiresAt: now() + (typeof ttlMs === 'number' ? ttlMs : ttlMs(value)) };
          return value;
        })
        .finally(() => {
          inFlight = undefined;
        });
    }
    return inFlight;
  };
}
