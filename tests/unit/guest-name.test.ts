import { describe, expect, it } from 'vitest';
import { analysisSummary, parseGuestName } from '@/modules/scan/utils/guest-name.js';

describe('parseGuestName', () => {
  it('prefers the stored guest name', () => {
    expect(parseGuestName('Ayla: Light · Warm undertone · Oval', 'Ayla')).toBe('Ayla');
  });

  it('parses the history summary prefix', () => {
    expect(parseGuestName('Bima: Medium · Cool undertone · Heart')).toBe('Bima');
  });

  it('falls back to Guest', () => {
    expect(parseGuestName('Light · Warm undertone · Oval')).toBe('Guest');
  });
});

describe('analysisSummary', () => {
  it('formats skin analysis', () => {
    expect(
      analysisSummary({ skinTone: 'Light', undertone: 'Warm', faceShape: 'Oval' }),
    ).toBe('Light · Warm undertone · Oval');
  });
});
