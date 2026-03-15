import type { ParsedSwapIntent, ResolvedIntent, SupportedChainInfo } from '@/types/agent';

function createChain(
  id: number,
  name: string,
  key: string,
  symbol: string,
  chainType = 'EVM' as SupportedChainInfo['chainType'],
): SupportedChainInfo {
  return {
    id,
    key,
    name,
    chainType,
    mainnet: true,
    coin: symbol,
    explorerUrls: [`https://${key}.scan.test`],
    rpcUrls: [`https://${key}.rpc.test`],
    nativeToken: {
      chainId: id,
      address: '0x0000000000000000000000000000000000000000',
      symbol,
      name: symbol,
      decimals: 18,
      priceUSD: '1',
    },
    supportLevel: chainType === 'EVM' ? 'fully-supported' : 'discovery-only',
    raw: {
      id,
      key,
      name,
      coin: symbol,
      chainType,
      mainnet: true,
      nativeToken: {
        chainId: id,
        address: '0x0000000000000000000000000000000000000000',
        symbol,
        name: symbol,
        decimals: 18,
        priceUSD: '1',
      },
      metamask:
        chainType === 'EVM'
          ? {
              chainId: `0x${id.toString(16)}`,
              chainName: name,
              blockExplorerUrls: [`https://${key}.scan.test`],
              rpcUrls: [`https://${key}.rpc.test`],
              nativeCurrency: {
                name: symbol,
                symbol,
                decimals: 18,
              },
            }
          : undefined,
    } as SupportedChainInfo['raw'],
  };
}

export const fixtureChains = {
  ethereum: createChain(1, 'Ethereum', 'eth', 'ETH'),
  base: createChain(8453, 'Base', 'bas', 'ETH'),
  arbitrum: createChain(42161, 'Arbitrum', 'arb', 'ETH'),
  optimism: createChain(10, 'Optimism', 'opt', 'ETH'),
  polygon: createChain(137, 'Polygon', 'pol', 'POL'),
  bnb: createChain(56, 'BNB Chain', 'bsc', 'BNB'),
  solana: createChain(1151111081099710, 'Solana', 'sol', 'SOL', 'SVM' as SupportedChainInfo['chainType']),
};

export const allFixtureChains = Object.values(fixtureChains);

export function createParsedIntent(overrides: Partial<ParsedSwapIntent> = {}): ParsedSwapIntent {
  return {
    actionType: 'swap',
    fromChain: {
      raw: 'Base',
      normalized: 'base',
    },
    toChain: {
      raw: 'Arbitrum',
      normalized: 'arbitrum',
    },
    fromToken: {
      raw: 'ETH',
      normalized: 'eth',
    },
    toToken: {
      raw: 'USDC',
      normalized: 'usdc',
    },
    amount: '1',
    amountType: 'exactIn',
    amountMode: 'fixed',
    fromAddress: null,
    recipientAddress: null,
    slippageBps: 50,
    routePreference: 'recommended',
    maxFeeUsd: null,
    maxTotalCostBps: null,
    minReceived: null,
    allowedTools: [],
    deniedTools: [],
    allowedChains: [],
    deniedChains: [],
    executionMode: 'confirm-first',
    rawPrompt: 'Swap 1 ETH on Base to USDC on Arbitrum',
    parserConfidence: 0.9,
    clarificationNeeded: false,
    clarificationQuestions: [],
    reasoning: [],
    dryRunOnly: false,
    ...overrides,
  };
}

export function createResolvedIntent(overrides: Partial<ResolvedIntent> = {}): ResolvedIntent {
  return {
    ...createParsedIntent(),
    fromChain: fixtureChains.base,
    toChain: fixtureChains.arbitrum,
    fromToken: {
      chainId: fixtureChains.base.id,
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      name: 'Ether',
      priceUSD: '3200',
      isNative: true,
      resolvedVia: 'symbol',
    },
    toToken: {
      chainId: fixtureChains.arbitrum.id,
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      priceUSD: '1',
      isNative: false,
      resolvedVia: 'symbol',
    },
    requestedAmount: '1',
    amountAtomic: '1000000000000000000',
    balanceAtomic: '2000000000000000000',
    warnings: [],
    ...overrides,
  };
}
