import { EVM, config as lifiConfig, createConfig } from '@lifi/sdk';

import { env } from '@/lib/config/env';
import { logEvent } from '@/lib/observability/logger';
import type { SupportedChainInfo } from '@/types/agent';

const evmProvider = EVM();
let configured = false;

function buildRpcUrls(chains: SupportedChainInfo[]) {
  return chains.reduce<Record<number, string[]>>((accumulator, chain) => {
    if (chain.rpcUrls.length) {
      accumulator[chain.id] = chain.rpcUrls;
    }
    return accumulator;
  }, {});
}

export function ensureLifiConfig(chains: SupportedChainInfo[] = []) {
  if (configured) {
    if (chains.length) {
      lifiConfig.setChains(chains.map((chain) => chain.raw));
      lifiConfig.setRPCUrls(buildRpcUrls(chains));
    }

    return;
  }

  createConfig({
    integrator: env.lifiIntegrator,
    apiUrl: env.lifiApiUrl,
    debug: env.enableDebug,
    preloadChains: false,
    providers: [evmProvider],
    routeOptions: {
      slippage: env.defaultSlippageBps / 10_000,
    },
    rpcUrls: buildRpcUrls(chains),
    chains: chains.map((chain) => chain.raw),
  });

  configured = true;

  logEvent('lifi', 'LI.FI SDK configured', {
    chains: chains.length,
  }, 'debug');
}

export function setLifiWalletOptions(options: Parameters<typeof evmProvider.setOptions>[0]) {
  ensureLifiConfig();
  evmProvider.setOptions(options);
}

export function syncLifiRuntimeChains(chains: SupportedChainInfo[]) {
  ensureLifiConfig(chains);
}
