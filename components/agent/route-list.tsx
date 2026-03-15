'use client';

import { Clock3, Coins, Route as RouteIcon } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { formatEta, formatTokenAmount, formatUsd } from '@/lib/utils/format';
import type { AppRouteOption } from '@/types/agent';

type RouteListProps = {
  routes: AppRouteOption[];
  selectedRouteId: string | null;
  onSelect: (routeId: string) => void;
};

export function RouteList({ routes, selectedRouteId, onSelect }: RouteListProps) {
  if (!routes.length) {
    return (
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="section-label text-xs text-cyan-200">Route options</p>
        <p className="mt-4 text-sm text-slate-400">
          No routes yet. Connect a wallet, parse a prompt, and refresh routes once the intent is fully resolved.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label text-xs text-cyan-200">Route options</p>
          <p className="mt-2 text-sm text-slate-400">Compare cost, ETA, tools, and bridge steps before approving any onchain action.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{routes.length} routes</span>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {routes.map((route) => (
          <button
            key={route.id}
            type="button"
            onClick={() => onSelect(route.id)}
            className={cn(
              'rounded-[1.6rem] border p-5 text-left transition',
              route.id === selectedRouteId
                ? 'border-cyan-300/45 bg-cyan-300/10'
                : 'border-white/10 bg-slate-950/45 hover:border-cyan-300/25',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{route.preferenceTag === 'secondary' ? 'Alternate route' : `${route.preferenceTag} route`}</p>
                <p className="mt-1 text-sm text-slate-400">{route.summary.toolNames.join(' • ')}</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{route.route.steps.length} steps</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <Coins className="size-3.5" />
                  Output
                </div>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatTokenAmount(route.summary.toAmount, route.route.toToken.decimals)} {route.route.toToken.symbol}
                </p>
                <p className="text-xs text-slate-400">Min {route.summary.toAmountMinFormatted}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <RouteIcon className="size-3.5" />
                  Cost
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{formatUsd(route.summary.totalCostUsd)}</p>
                <p className="text-xs text-slate-400">Gas {formatUsd(route.summary.gasCostUsd)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <Clock3 className="size-3.5" />
                  ETA
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{formatEta(route.summary.durationSeconds)}</p>
                <p className="text-xs text-slate-400">{route.summary.bridgeNames.join(', ') || 'No bridge hop'}</p>
              </div>
            </div>
            {route.warnings.length ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                {route.warnings[0]?.message}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
