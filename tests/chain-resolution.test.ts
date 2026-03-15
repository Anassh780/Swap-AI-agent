import { describe, expect, it } from 'vitest';

import { resolveChainReference } from '@/lib/chains/resolver';
import { allFixtureChains } from '@/tests/fixtures';

describe('resolveChainReference', () => {
  it('resolves common aliases such as bsc to BNB Chain', () => {
    const result = resolveChainReference('bsc', allFixtureChains);

    expect(result.status).toBe('resolved');
    expect(result.chain?.name).toBe('BNB Chain');
  });

  it('resolves mainnet to Ethereum', () => {
    const result = resolveChainReference('mainnet', allFixtureChains);

    expect(result.status).toBe('resolved');
    expect(result.chain?.name).toBe('Ethereum');
  });
});
