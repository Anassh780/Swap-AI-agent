'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LogOut, RefreshCw, Wallet } from 'lucide-react';
import { useState } from 'react';

import { fetchSupportedChains } from '@/lib/chains/metadata';
import { shortenAddress } from '@/lib/utils/format';
import { useWalletActions, useWalletSnapshot } from '@/lib/wallet/hooks';

export function WalletPanel() {
  const [open, setOpen] = useState(false);
  const wallet = useWalletSnapshot();
  const walletActions = useWalletActions();
  const chainsQuery = useQuery({
    queryKey: ['supported-chains'],
    queryFn: fetchSupportedChains,
  });

  const currentChain = chainsQuery.data?.find((chain) => chain.id === wallet.chainId);

  if (wallet.isConnected) {
    return (
      <div className="relative">
        <button
          className="glass-panel flex items-center gap-3 rounded-full px-4 py-2 text-sm text-slate-100"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <Wallet className="size-4 text-cyan-300" />
          <span>{shortenAddress(wallet.address)}</span>
          <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">{currentChain?.name ?? 'Unknown chain'}</span>
          <ChevronDown className="size-4 text-slate-400" />
        </button>
        {open ? (
          <div className="glass-panel absolute right-0 top-14 z-20 min-w-72 rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Wallet session</p>
            <p className="mt-2 font-medium text-white">{wallet.address}</p>
            <p className="mt-1 text-sm text-slate-400">Current chain: {currentChain?.name ?? wallet.chainId ?? 'Unknown'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => walletActions.reconnect.reconnect()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                <RefreshCw className="size-4" />
                Reconnect
              </button>
              <button
                type="button"
                onClick={() => walletActions.disconnect.disconnect()}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-300/40 hover:text-white"
              >
                <LogOut className="size-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Wallet className="size-4 text-cyan-300" />
        Connect wallet
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open ? (
        <div className="glass-panel absolute right-0 top-14 z-20 min-w-80 rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Connect a signer</p>
          <div className="mt-4 space-y-2">
            {walletActions.connect.connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                onClick={() => walletActions.connect.connect({ connector })}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/5"
              >
                <span>{connector.name}</span>
                <span className="text-xs text-slate-400">{connector.type}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
