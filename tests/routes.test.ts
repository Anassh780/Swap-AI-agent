import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRouteOptions } from '@/lib/lifi/routes';
import { allFixtureChains, createResolvedIntent } from '@/tests/fixtures';

const getRoutesMock = vi.fn();

vi.mock('@lifi/sdk', () => ({
  getRoutes: (...args: unknown[]) => getRoutesMock(...args),
}));

vi.mock('@/lib/lifi/config', () => ({
  ensureLifiConfig: vi.fn(),
}));

const baseRoute = {
  insurance: {
    state: 'NOT_INSURABLE',
    feeAmountUsd: '0',
  },
  fromChainId: 8453,
  fromAmountUSD: '1000',
  fromAmount: '1000000000',
  fromToken: {
    chainId: 8453,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    priceUSD: '3200',
  },
  toChainId: 42161,
  toAmountUSD: '995',
  toAmount: '995000000',
  toAmountMin: '990000000',
  toToken: {
    chainId: 42161,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    priceUSD: '1',
  },
  steps: [
    {
      id: 'step-1',
      type: 'lifi',
      tool: 'tool',
      toolDetails: {
        key: 'tool',
        name: 'Mock Bridge',
        logoURI: '',
      },
      action: {
        fromChainId: 8453,
        toChainId: 42161,
        fromAmount: '1000000000',
        fromToken: {
          chainId: 8453,
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          decimals: 18,
          priceUSD: '3200',
        },
        toToken: {
          chainId: 42161,
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          priceUSD: '1',
        },
      },
      estimate: {
        tool: 'tool',
        fromAmount: '1000000000',
        fromAmountUSD: '1000',
        toAmount: '995000000',
        toAmountMin: '990000000',
        toAmountUSD: '995',
        approvalAddress: '0x3333333333333333333333333333333333333333',
        executionDuration: 120,
        gasCosts: [],
        feeCosts: [],
      },
      includedSteps: [
        {
          id: 'included-1',
          type: 'cross',
          tool: 'tool',
          toolDetails: {
            key: 'tool',
            name: 'Mock Bridge',
            logoURI: '',
          },
          action: {
            fromChainId: 8453,
            toChainId: 42161,
            fromAmount: '1000000000',
            fromToken: {
              chainId: 8453,
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              name: 'Ether',
              decimals: 18,
              priceUSD: '3200',
            },
            toToken: {
              chainId: 42161,
              address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              priceUSD: '1',
            },
          },
          estimate: {
            tool: 'tool',
            fromAmount: '1000000000',
            toAmount: '995000000',
            toAmountMin: '990000000',
            approvalAddress: '0x3333333333333333333333333333333333333333',
            executionDuration: 120,
            gasCosts: [],
            feeCosts: [],
          },
        },
      ],
    },
  ],
};

const baseStep = baseRoute.steps[0]!;

describe('fetchRouteOptions', () => {
  beforeEach(() => {
    getRoutesMock.mockReset();
  });

  it('ranks the cheapest route first when requested', async () => {
    getRoutesMock.mockResolvedValue({
      routes: [
        {
          ...baseRoute,
          id: 'expensive',
          gasCostUSD: '15',
          steps: [
            {
              ...baseStep,
              estimate: {
                ...baseStep.estimate,
                gasCosts: [{ amountUSD: '15' }],
                executionDuration: 90,
              },
            },
          ],
        },
        {
          ...baseRoute,
          id: 'cheap',
          gasCostUSD: '5',
          steps: [
            {
              ...baseStep,
              estimate: {
                ...baseStep.estimate,
                gasCosts: [{ amountUSD: '5' }],
                executionDuration: 240,
              },
            },
          ],
        },
      ],
      unavailableRoutes: {
        filteredOut: [],
        failed: [],
      },
    });

    const result = await fetchRouteOptions(
      createResolvedIntent({
        routePreference: 'cheapest',
      }),
      allFixtureChains,
      '0x4444444444444444444444444444444444444444',
    );

    expect(result.routes[0]?.id).toBe('cheap');
  });
});
