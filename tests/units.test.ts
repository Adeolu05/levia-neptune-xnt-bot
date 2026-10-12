import { describe, expect, it } from 'vitest';
import {
  baseUnitsToXntNumber,
  formatHashrate,
  formatInteger,
  formatPercentChange,
  formatRatio,
  formatXnt,
  hashrateScale,
} from '../src/neptune/units.js';

// Captured from https://api.neptunescan.io/api/overview on 2026-10-12.
const TOTAL_REWARD = 2504042784368000000000000000000000000n;

describe('units', () => {
  it('formats explorer base units exactly as the explorer UI shows XNT', () => {
    expect(formatXnt(TOTAL_REWARD)).toBe('2,504,042.7844 XNT');
    expect(formatXnt(TOTAL_REWARD, 2)).toBe('2,504,042.78 XNT');
    expect(formatXnt(1942384000000000000000000000000000000n, 0)).toBe('1,942,384 XNT');
  });

  it('rounds half up without floating point', () => {
    expect(formatRatio(5n, 1000n, 2)).toBe('0.01');
    expect(formatRatio(4n, 1000n, 2)).toBe('0.00');
    expect(formatRatio(12345678901234567890123n, 1n, 0)).toBe('12,345,678,901,234,567,890,123');
  });

  it('formats large integers with separators', () => {
    expect(formatInteger(271865533734n)).toBe('271,865,533,734');
    expect(formatInteger(0n)).toBe('0');
  });

  it('formats hashrate with an appropriate unit', () => {
    expect(formatHashrate(1147874360n)).toBe('1.15 GH/s');
    expect(formatHashrate(999n)).toBe('999.00 H/s');
    expect(formatHashrate(2_500_000_000_000n)).toBe('2.50 TH/s');
  });

  it('formats signed percentage changes', () => {
    expect(formatPercentChange(1147871355n, 964924625n)).toBe('+18.96%');
    expect(formatPercentChange(1147871355n, 1330253150n)).toBe('-13.71%');
    expect(formatPercentChange(100n, 100n)).toBe('0.00%');
    expect(() => formatPercentChange(1n, 0n)).toThrow(RangeError);
  });

  it('converts base units to a display number of XNT', () => {
    expect(baseUnitsToXntNumber(TOTAL_REWARD)).toBeCloseTo(2504042.784368, 6);
  });

  it('picks a single display unit for a hashrate', () => {
    expect(hashrateScale(1_537_983_238n)).toEqual({ divisor: 1_000_000_000n, unit: 'GH/s' });
    expect(hashrateScale(5n)).toEqual({ divisor: 1n, unit: 'H/s' });
  });
});
