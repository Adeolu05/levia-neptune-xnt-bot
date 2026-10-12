/**
 * NeptuneScan reports coin amounts in base units of 10^30 per XNT. This was
 * confirmed on 2026-10-12 by matching the explorer API's `total_reward`
 * (2504042784368000000000000000000000000) with the explorer UI's displayed
 * circulating supply (2,504,042.7844 XNT), and block 0's coinbase with the
 * 1,942,384 XNT premine defined in xnt-core.
 */
export const BASE_UNITS_PER_XNT = 10n ** 30n;

const NON_NEGATIVE_INTEGER = /^(0|[1-9]\d*)$/;

export function isIntegerString(value: string): boolean {
  return NON_NEGATIVE_INTEGER.test(value);
}

function groupThousands(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Exact `numerator / denominator` rounded half-up, with thousands separators. */
export function formatRatio(
  numerator: bigint,
  denominator: bigint,
  fractionDigits: number,
): string {
  if (numerator < 0n || denominator <= 0n) {
    throw new RangeError('formatRatio expects a non-negative numerator and positive denominator');
  }
  const scale = 10n ** BigInt(fractionDigits);
  const scaled = (numerator * scale * 2n + denominator) / (denominator * 2n);
  const whole = groupThousands(scaled / scale);
  if (fractionDigits === 0) {
    return whole;
  }
  return `${whole}.${(scaled % scale).toString().padStart(fractionDigits, '0')}`;
}

export function formatInteger(value: bigint): string {
  return formatRatio(value, 1n, 0);
}

export function formatXnt(baseUnits: bigint, fractionDigits = 4): string {
  return `${formatRatio(baseUnits, BASE_UNITS_PER_XNT, fractionDigits)} XNT`;
}

/** Converts base units to a JavaScript number of whole XNT for display maths (e.g. market cap). */
export function baseUnitsToXntNumber(baseUnits: bigint): number {
  return Number(baseUnits / 10n ** 18n) / 1e12;
}

const HASHRATE_UNITS = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];

/** The display unit for a hashrate, e.g. 1.15e9 → { divisor: 1e9, unit: "GH/s" }. */
export function hashrateScale(hashesPerSecond: bigint): { divisor: bigint; unit: string } {
  let unitIndex = 0;
  let divisor = 1n;
  while (unitIndex < HASHRATE_UNITS.length - 1 && hashesPerSecond >= divisor * 1000n) {
    divisor *= 1000n;
    unitIndex += 1;
  }
  return { divisor, unit: HASHRATE_UNITS[unitIndex] as string };
}

export function formatHashrate(hashesPerSecond: bigint): string {
  const { divisor, unit } = hashrateScale(hashesPerSecond);
  return `${formatRatio(hashesPerSecond, divisor, 2)} ${unit}`;
}

/** Signed percentage change from `previous` to `current`, e.g. "+18.96%". */
export function formatPercentChange(current: bigint, previous: bigint): string {
  if (previous <= 0n) {
    throw new RangeError('Percentage change requires a positive previous value');
  }
  const difference = current - previous;
  const magnitude = formatRatio((difference < 0n ? -difference : difference) * 100n, previous, 2);
  if (magnitude === '0.00') {
    return '0.00%';
  }
  return `${difference < 0n ? '-' : '+'}${magnitude}%`;
}
