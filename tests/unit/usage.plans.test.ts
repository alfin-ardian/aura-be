import { describe, expect, it } from 'vitest';
import { getUsagePlan, planTotals, weekIndexInMonth } from '@/modules/usage/plans.js';

describe('usage plans', () => {
  it('computes PPN 11% totals', () => {
    expect(planTotals(100_000)).toEqual({
      subtotal: 100_000,
      tax: 11_000,
      total: 111_000,
    });
  });

  it('resolves known pack ids', () => {
    expect(getUsagePlan('growth')?.scans).toBe(3_000);
    expect(getUsagePlan('custom')?.contactSales).toBe(true);
    expect(getUsagePlan('unknown')).toBeUndefined();
  });

  it('maps calendar days into month weeks', () => {
    expect(weekIndexInMonth(new Date(2026, 7, 1))).toBe(0);
    expect(weekIndexInMonth(new Date(2026, 7, 8))).toBe(1);
    expect(weekIndexInMonth(new Date(2026, 7, 31))).toBe(4);
  });
});
