import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTokenReference } from '@/lib/tokens/resolver';
import { fixtureChains } from '@/tests/fixtures';

const getTokenMock = vi.fn();
const getTokensMock = vi.fn();

vi.mock('@lifi/sdk', () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
  getTokens: (...args: unknown[]) => getTokensMock(...args),
}));

describe('resolveTokenReference', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    getTokensMock.mockReset();
  });

  it('marks duplicated exact matches as ambiguous', async () => {
    getTokenMock.mockRejectedValue(new Error('not found'));
    getTokensMock.mockResolvedValue({
      tokens: {
        [fixtureChains.base.id]: [
          {
            chainId: fixtureChains.base.id,
            address: '0x1111111111111111111111111111111111111111',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            priceUSD: '1',
          },
          {
            chainId: fixtureChains.base.id,
            address: '0x2222222222222222222222222222222222222222',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            priceUSD: '1',
          },
        ],
      },
    });

    const result = await resolveTokenReference(fixtureChains.base, 'USDC');

    expect(result.status).toBe('ambiguous');
    expect(result.matches).toHaveLength(2);
  });
});
