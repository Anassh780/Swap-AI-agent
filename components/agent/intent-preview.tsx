'use client';

import { useQuery } from '@tanstack/react-query';
import { useDeferredValue } from 'react';
import { AlertTriangle, ArrowRightLeft, ShieldCheck } from 'lucide-react';

import { normalizeEntity } from '@/lib/ai/normalize';
import { searchTokensForChain } from '@/lib/tokens/resolver';
import { cn } from '@/lib/utils/cn';
import type { ParsedSwapIntent, SafetyAlert, SupportedChainInfo } from '@/types/agent';

type IntentPreviewProps = {
  intent: ParsedSwapIntent | null;
  supportedChains: SupportedChainInfo[];
  alerts: SafetyAlert[];
  onIntentChange: (intent: ParsedSwapIntent) => void;
  onRefresh: () => void;
  isPending?: boolean;
};

type TokenFieldProps = {
  label: string;
  value: string;
  chainId?: number;
  onChange: (value: string) => void;
};

function TokenField({ label, value, chainId, onChange }: TokenFieldProps) {
  const deferredValue = useDeferredValue(value);
  const suggestionsQuery = useQuery({
    queryKey: ['token-search', chainId, deferredValue],
    queryFn: () => searchTokensForChain(chainId!, deferredValue),
    enabled: Boolean(chainId && deferredValue.length >= 2),
  });

  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
        placeholder="ETH, USDC, cbBTC, 0x..."
      />
      {suggestionsQuery.data?.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestionsQuery.data.slice(0, 6).map((token) => (
            <button
              key={`${token.chainId}-${token.address}`}
              type="button"
              onClick={() => onChange(token.symbol)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
            >
              {token.symbol}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

export function IntentPreview({ intent, supportedChains, alerts, onIntentChange, onRefresh, isPending }: IntentPreviewProps) {
  if (!intent) {
    return (
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="section-label text-xs text-cyan-200">Intent review</p>
        <p className="mt-4 text-sm text-slate-400">
          Your parsed intent will appear here so you can edit chains, assets, amount, and safety thresholds before fetching routes.
        </p>
      </section>
    );
  }

  const fromChainId = supportedChains.find((chain) => chain.name === intent.fromChain?.raw)?.id;
  const toChainId = supportedChains.find((chain) => chain.name === intent.toChain?.raw)?.id;

  const updateIntent = <K extends keyof ParsedSwapIntent>(key: K, value: ParsedSwapIntent[K]) => {
    onIntentChange({
      ...intent,
      [key]: value,
    });
  };

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label text-xs text-cyan-200">Intent review</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
              <ShieldCheck className="size-4" />
              Parser confidence {(intent.parserConfidence * 100).toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-slate-300">
              <ArrowRightLeft className="size-4 text-cyan-300" />
              {intent.actionType}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isPending}
          className={cn(
            'rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-300/40 hover:bg-white/5',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          Refresh routes
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Source chain</span>
          <select
            value={intent.fromChain?.raw ?? ''}
            onChange={(event) => updateIntent('fromChain', normalizeEntity(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          >
            <option value="">Select chain</option>
            {supportedChains.map((chain) => (
              <option key={chain.id} value={chain.name}>
                {chain.name}
              </option>
            ))}
          </select>
        </label>
        <TokenField
          label="Source token"
          value={intent.fromToken?.raw ?? ''}
          chainId={fromChainId}
          onChange={(value) => updateIntent('fromToken', normalizeEntity(value))}
        />
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Destination chain</span>
          <select
            value={intent.toChain?.raw ?? ''}
            onChange={(event) => updateIntent('toChain', normalizeEntity(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          >
            <option value="">Select chain</option>
            {supportedChains.map((chain) => (
              <option key={chain.id} value={chain.name}>
                {chain.name}
              </option>
            ))}
          </select>
        </label>
        <TokenField
          label="Destination token"
          value={intent.toToken?.raw ?? ''}
          chainId={toChainId}
          onChange={(value) => updateIntent('toToken', normalizeEntity(value))}
        />
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Amount</span>
          <input
            value={intent.amountMode === 'all' ? 'ALL' : intent.amount ?? ''}
            onChange={(event) => {
              const nextValue = event.target.value;
              updateIntent('amountMode', nextValue.trim().toLowerCase() === 'all' ? 'all' : 'fixed');
              updateIntent('amount', nextValue.trim().toLowerCase() === 'all' ? 'ALL' : nextValue);
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            placeholder="0.5 or ALL"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Route preference</span>
          <select
            value={intent.routePreference}
            onChange={(event) => updateIntent('routePreference', event.target.value as ParsedSwapIntent['routePreference'])}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          >
            <option value="recommended">Recommended</option>
            <option value="cheapest">Cheapest</option>
            <option value="fastest">Fastest</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Max fee (USD)</span>
          <input
            value={intent.maxFeeUsd ?? ''}
            onChange={(event) => updateIntent('maxFeeUsd', event.target.value ? Number.parseFloat(event.target.value) : null)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            placeholder="10"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Slippage (bps)</span>
          <input
            value={intent.slippageBps ?? ''}
            onChange={(event) => updateIntent('slippageBps', event.target.value ? Number.parseInt(event.target.value, 10) : null)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            placeholder="50"
          />
        </label>
      </div>
      {alerts.length ? (
        <div className="mt-6 space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'rounded-2xl border px-4 py-3 text-sm',
                alert.severity === 'error'
                  ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                  : 'border-amber-300/20 bg-amber-300/10 text-amber-100',
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm/6 opacity-90">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
