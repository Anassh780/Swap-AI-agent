import { beforeEach, describe, expect, it } from 'vitest';

import { useAgentStore } from '@/stores/agent-store';
import { createResolvedIntent } from '@/tests/fixtures';

describe('useAgentStore recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAgentStore.setState({
      settings: {
        routePreference: 'recommended',
        slippageBps: 50,
        exactApprovalOnly: true,
        debugMode: false,
      },
      activeExecution: null,
      history: [],
    });
  });

  it('persists the active execution record for refresh recovery', () => {
    useAgentStore.getState().setActiveExecution({
      id: 'exec-1',
      routeId: 'route-1',
      intent: createResolvedIntent(),
      route: {
        id: 'route-1',
        insurance: {
          state: 'NOT_INSURABLE',
          feeAmountUsd: '0',
        },
        fromChainId: 8453,
        fromAmountUSD: '1000',
        fromAmount: '1000000000',
        fromToken: createResolvedIntent().fromToken,
        toChainId: 42161,
        toAmountUSD: '995',
        toAmount: '995000000',
        toAmountMin: '990000000',
        toToken: createResolvedIntent().toToken,
        steps: [],
      },
      status: 'executing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      events: [],
      routePreference: 'recommended',
      explorerLinks: [],
      canResume: true,
    });

    const saved = window.localStorage.getItem('swap-agent-store');

    expect(useAgentStore.getState().activeExecution?.id).toBe('exec-1');
    expect(saved).toContain('exec-1');
  });
});
