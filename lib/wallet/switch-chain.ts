'use client';

import type { Config } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';

export async function getWalletClientForChain(wagmiConfig: Config, chainId?: number) {
  return getWalletClient(wagmiConfig, chainId ? { chainId } : undefined);
}
