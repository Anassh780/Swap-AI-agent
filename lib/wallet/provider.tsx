'use client';

import { useSyncWagmiConfig } from '@lifi/wallet-management';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { WagmiProvider, useAccount, useSwitchChain } from 'wagmi';

import { fetchSupportedChains } from '@/lib/chains/metadata';
import { isEvmChain } from '@/lib/chains/type-guards';
import { syncLifiRuntimeChains, setLifiWalletOptions } from '@/lib/lifi/config';
import { captureException } from '@/lib/observability/error-reporting';
import { persistWalletSession } from '@/lib/wallet/session';
import { wagmiConfig, walletConnectors } from '@/lib/wallet/config';
import { getWalletClientForChain } from '@/lib/wallet/switch-chain';

function WalletRuntimeBridge() {
  const account = useAccount();
  const switchChain = useSwitchChain();

  useEffect(() => {
    persistWalletSession({
      lastKnownAddress: account.address,
      lastKnownChainId: account.chainId,
    });
  }, [account.address, account.chainId]);

  useEffect(() => {
    setLifiWalletOptions({
      getWalletClient: async () => {
        const client = await getWalletClientForChain(wagmiConfig);

        if (!client) {
          throw new Error('Connect a wallet before requesting LI.FI execution.');
        }

        return client;
      },
      switchChain: async (chainId) => {
        if (!switchChain.switchChainAsync) {
          throw new Error('The connected wallet cannot switch chains programmatically.');
        }

        await switchChain.switchChainAsync({
          chainId,
        });

        return getWalletClientForChain(wagmiConfig, chainId);
      },
    });
  }, [switchChain]);

  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const chainsQuery = useQuery({
    queryKey: ['supported-chains'],
    queryFn: fetchSupportedChains,
  });

  useSyncWagmiConfig(
    wagmiConfig,
    walletConnectors,
    (chainsQuery.data ?? []).filter(isEvmChain).map((chain) => chain.raw),
  );

  useEffect(() => {
    if (!chainsQuery.data) {
      return;
    }

    try {
      syncLifiRuntimeChains(chainsQuery.data);
    } catch (error) {
      captureException(error, {
        scope: 'WalletProvider.syncLifiRuntimeChains',
      });
    }
  }, [chainsQuery.data]);

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <WalletRuntimeBridge />
      {children}
    </WagmiProvider>
  );
}
