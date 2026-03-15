import { ChainType } from '@lifi/sdk';

import type { SupportedChainInfo } from '@/types/agent';

export function isEvmChain(chain?: SupportedChainInfo | null): chain is SupportedChainInfo {
  return chain?.chainType === ChainType.EVM;
}

export function isDiscoveryOnlyChain(chain?: SupportedChainInfo | null) {
  return chain?.supportLevel === 'discovery-only';
}
