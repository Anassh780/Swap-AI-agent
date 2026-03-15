import { describe, expect, it } from 'vitest';

import { resolveAllAmountAtomic } from '@/lib/lifi/balances';
import { createResolvedIntent } from '@/tests/fixtures';

describe('resolveAllAmountAtomic', () => {
  it('reserves native gas when moving an entire native balance', () => {
    const intent = createResolvedIntent();
    const result = resolveAllAmountAtomic(intent, '1000000000000000000');

    expect(BigInt(result)).toBeLessThan(1000000000000000000n);
    expect(BigInt(result)).toBeGreaterThan(0n);
  });

  it('returns full balance for ERC-20 transfers', () => {
    const intent = createResolvedIntent({
      fromToken: {
        ...createResolvedIntent().fromToken,
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        isNative: false,
      },
    });

    expect(resolveAllAmountAtomic(intent, '1500000')).toBe('1500000');
  });
});
