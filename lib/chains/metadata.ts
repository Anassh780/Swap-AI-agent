import { ChainType, getChains } from '@lifi/sdk';

import { env } from '@/lib/config/env';
import { logEvent } from '@/lib/observability/logger';
import type { SupportedChainInfo } from '@/types/agent';

function normalizeChain(rawChain: Awaited<ReturnType<typeof getChains>>[number]): SupportedChainInfo {
  const explorerUrls = 'metamask' in rawChain ? rawChain.metamask.blockExplorerUrls ?? [] : [];
  const rpcUrls =
    env.rpcUrlMap[rawChain.id] ??
    ('metamask' in rawChain ? rawChain.metamask.rpcUrls ?? [] : []);

  return {
    id: rawChain.id,
    key: rawChain.key,
    name: rawChain.name,
    chainType: rawChain.chainType,
    mainnet: rawChain.mainnet,
    coin: rawChain.coin,
    logoURI: rawChain.logoURI,
    explorerUrls,
    rpcUrls,
    nativeToken: rawChain.nativeToken,
    supportLevel: rawChain.chainType === ChainType.EVM ? 'fully-supported' : 'discovery-only',
    raw: rawChain,
  };
}

export async function fetchSupportedChains() {
  const chains = await getChains();
  const normalizedChains = chains.filter((chain) => chain.mainnet).map(normalizeChain);

  logEvent('chains', 'Fetched supported chains', {
    count: normalizedChains.length,
  }, 'debug');

  return normalizedChains.sort((left, right) => left.name.localeCompare(right.name));
}

export function getDefaultChainIds() {
  return [1, 8453, 42161, 10, 137, 56];
}
