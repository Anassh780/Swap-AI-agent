import { describe, expect, it } from 'vitest';

import { parsePromptHeuristically } from '@/lib/ai/heuristic-parser';
import { allFixtureChains } from '@/tests/fixtures';

describe('parsePromptHeuristically', () => {
  it('parses all-balance, multi-chain prompts with fee constraints', () => {
    const result = parsePromptHeuristically(
      'Move all my WETH on Arbitrum to SOL on Solana if the route is under 1% total cost',
      allFixtureChains,
    );

    expect(result.amountMode).toBe('all');
    expect(result.amount).toBe('ALL');
    expect(result.fromChain?.raw).toBe('Arbitrum');
    expect(result.toChain?.raw).toBe('Solana');
    expect(result.fromToken?.raw).toBe('WETH');
    expect(result.toToken?.raw).toBe('SOL');
    expect(result.maxTotalCostBps).toBe(100);
  });

  it('flags incomplete portfolio-style prompts for clarification', () => {
    const result = parsePromptHeuristically(
      'Convert my balance on Polygon into USDT on BNB Chain',
      allFixtureChains,
    );

    expect(result.fromChain?.raw).toBe('Polygon');
    expect(result.toChain?.raw).toBe('BNB Chain');
    expect(result.fromToken).toBeNull();
    expect(result.clarificationNeeded).toBe(true);
    expect(result.clarificationQuestions).toContain('Which asset are you sending from the source chain?');
  });
});
