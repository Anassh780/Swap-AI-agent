'use client';

import { useAccount, useChainId, useConnect, useDisconnect, useReconnect, useWalletClient } from 'wagmi';

import type { WalletSessionSnapshot } from '@/types/agent';

export function useWalletSnapshot(): WalletSessionSnapshot {
  const account = useAccount();
  const chainId = useChainId();

  return {
    address: account.address ?? null,
    chainId,
    isConnected: account.isConnected,
    isConnecting: account.isConnecting || account.isReconnecting,
  };
}

export function useWalletActions() {
  const connect = useConnect();
  const reconnect = useReconnect();
  const disconnect = useDisconnect();
  const walletClient = useWalletClient();

  return {
    connect,
    reconnect,
    disconnect,
    walletClient: walletClient.data,
    isPending: connect.isPending || reconnect.isPending || disconnect.isPending,
  };
}
