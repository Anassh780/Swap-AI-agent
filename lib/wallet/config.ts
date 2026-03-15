'use client';

import { createClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { createConfig } from 'wagmi';
import { coinbaseWallet, injected, safe, walletConnect } from 'wagmi/connectors';

import { env } from '@/lib/config/env';

export const walletConnectors = [
  safe(),
  injected(),
  coinbaseWallet({
    appName: env.appName,
  }),
  ...(env.walletConnectProjectId
    ? [
        walletConnect({
          projectId: env.walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: env.appName,
            description: 'Prompt-driven, confirmation-first cross-chain swap agent powered by LI.FI.',
            url: env.appUrl,
            icons: [`${env.appUrl}/icon.svg`],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: walletConnectors,
  multiInjectedProviderDiscovery: true,
  ssr: false,
  client({ chain }) {
    return createClient({
      chain,
      transport: http(),
    });
  },
});
