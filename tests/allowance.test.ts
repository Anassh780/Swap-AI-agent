import { describe, expect, it } from 'vitest';

import { isAllowanceApprovalRequired } from '@/lib/lifi/allowance';

describe('isAllowanceApprovalRequired', () => {
  it('does not require approval for native tokens', () => {
    expect(
      isAllowanceApprovalRequired(
        0n,
        '1000000000000000000',
        '0x0000000000000000000000000000000000000000',
        '0x1111111111111111111111111111111111111111',
      ),
    ).toBe(false);
  });

  it('requires approval when allowance is lower than the required amount', () => {
    expect(
      isAllowanceApprovalRequired(
        500n,
        '1000',
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        '0x1111111111111111111111111111111111111111',
      ),
    ).toBe(true);
  });
});
