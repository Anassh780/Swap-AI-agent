import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveIntentForExecution } from '@/lib/execution/preflight';
import { createParsedIntent, fixtureChains } from '@/tests/fixtures';

const resolveChainReferenceMock = vi.fn();
const resolveTokenReferenceMock = vi.fn();
const fetchWalletBalancesMock = vi.fn();
const findTokenBalanceMock = vi.fn();
const findNativeBalanceMock = vi.fn();
const resolveAllAmountAtomicMock = vi.fn();
const getTokenSafetyAlertsMock = vi.fn();

vi.mock('@/lib/chains/resolver', () => ({
  resolveChainReference: (...args: unknown[]) => resolveChainReferenceMock(...args),
}));

vi.mock('@/lib/tokens/resolver', () => ({
  resolveTokenReference: (...args: unknown[]) => resolveTokenReferenceMock(...args),
  isNativeTokenAddress: (address: string) => /^0x0+$/.test(address),
}));

vi.mock('@/lib/lifi/balances', () => ({
  fetchWalletBalances: (...args: unknown[]) => fetchWalletBalancesMock(...args),
  findTokenBalance: (...args: unknown[]) => findTokenBalanceMock(...args),
  findNativeBalance: (...args: unknown[]) => findNativeBalanceMock(...args),
  resolveAllAmountAtomic: (...args: unknown[]) => resolveAllAmountAtomicMock(...args),
}));

vi.mock('@/lib/security/token-guards', () => ({
  getTokenSafetyAlerts: (...args: unknown[]) => getTokenSafetyAlertsMock(...args),
}));

describe('resolveIntentForExecution', () => {
  beforeEach(() => {
    resolveChainReferenceMock.mockReset();
    resolveTokenReferenceMock.mockReset();
    fetchWalletBalancesMock.mockReset();
    findTokenBalanceMock.mockReset();
    findNativeBalanceMock.mockReset();
    resolveAllAmountAtomicMock.mockReset();
    getTokenSafetyAlertsMock.mockReset();
    getTokenSafetyAlertsMock.mockReturnValue([]);
  });

  it('blocks non-EVM execution paths with an explicit unsupported warning', async () => {
    resolveChainReferenceMock
      .mockReturnValueOnce({ status: 'resolved', chain: fixtureChains.base })
      .mockReturnValueOnce({ status: 'resolved', chain: fixtureChains.solana });

    const result = await resolveIntentForExecution(createParsedIntent(), Object.values(fixtureChains), '0x1234567890123456789012345678901234567890');

    expect(result.status).toBe('unsupported');
    expect(result.alerts[0]?.code).toBe('NON_EVM_DESTINATION');
  });

  it('returns a resolved intent with a gas warning when native balance is missing', async () => {
    resolveChainReferenceMock
      .mockReturnValueOnce({ status: 'resolved', chain: fixtureChains.base })
      .mockReturnValueOnce({ status: 'resolved', chain: fixtureChains.arbitrum });
    resolveTokenReferenceMock
      .mockResolvedValueOnce({
        status: 'resolved',
        token: {
          chainId: fixtureChains.base.id,
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          priceUSD: '1',
          isNative: false,
          resolvedVia: 'symbol',
        },
      })
      .mockResolvedValueOnce({
        status: 'resolved',
        token: {
          chainId: fixtureChains.arbitrum.id,
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          decimals: 18,
          priceUSD: '3200',
          isNative: true,
          resolvedVia: 'symbol',
        },
      });
    fetchWalletBalancesMock.mockResolvedValue({});
    findTokenBalanceMock.mockReturnValue({
      amount: '2000000',
    });
    findNativeBalanceMock.mockReturnValue(null);

    const result = await resolveIntentForExecution(
      createParsedIntent({
        fromToken: { raw: 'USDC', normalized: 'usdc' },
        toToken: { raw: 'ETH', normalized: 'eth' },
      }),
      Object.values(fixtureChains),
      '0x1234567890123456789012345678901234567890',
    );

    expect(result.status).toBe('resolved');
    expect(result.alerts.some((alert) => alert.code === 'INSUFFICIENT_GAS')).toBe(true);
  });
});
