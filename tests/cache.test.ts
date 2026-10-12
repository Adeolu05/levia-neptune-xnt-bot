import { describe, expect, it, vi } from 'vitest';
import { cached } from '../src/cache.js';

describe('cached', () => {
  it('reuses a value until it expires and de-duplicates concurrent loads', async () => {
    let now = 0;
    const load = vi.fn().mockImplementation(() => Promise.resolve(now));
    const get = cached(load, 1000, () => now);

    await expect(Promise.all([get(), get()])).resolves.toEqual([0, 0]);
    now = 999;
    await expect(get()).resolves.toBe(0);
    now = 1000;
    await expect(get()).resolves.toBe(1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const get = cached(load, 1000);

    await expect(get()).rejects.toThrow('down');
    await expect(get()).resolves.toBe('ok');
  });

  it('supports a value-dependent TTL', async () => {
    let now = 0;
    const load = vi.fn().mockResolvedValue({ complete: false });
    const get = cached(
      load,
      (value: { complete: boolean }) => (value.complete ? 1000 : 10),
      () => now,
    );

    await get();
    now = 10;
    await get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
