'use client';

import Link from 'next/link';

import { WalletPanel } from '@/components/agent/wallet-panel';

export function TopNav() {
  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4">
        <div className="space-y-1">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Atlas Swap Agent
          </Link>
          <p className="text-sm text-slate-400">Prompt-driven, reviewable cross-chain swaps powered by LI.FI.</p>
        </div>
        <nav className="hidden items-center gap-4 text-sm text-slate-300 md:flex">
          <Link href="/" className="transition hover:text-white">
            Agent
          </Link>
          <Link href="/supported" className="transition hover:text-white">
            Supported Chains
          </Link>
        </nav>
        <WalletPanel />
      </div>
    </header>
  );
}
