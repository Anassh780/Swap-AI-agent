'use client';

import { CheckCircle2, ShieldAlert } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { formatEta, formatUsd } from '@/lib/utils/format';
import type { AppRouteOption, PreflightCheck, ResolvedIntent } from '@/types/agent';

type ConfirmationPanelProps = {
  intent: ResolvedIntent | null;
  route: AppRouteOption | null;
  preflight: PreflightCheck | null;
  approvalHash: string | null;
  onApprove: () => void;
  onExecute: () => void;
  approvePending?: boolean;
  executePending?: boolean;
};

export function ConfirmationPanel({
  intent,
  route,
  preflight,
  approvalHash,
  onApprove,
  onExecute,
  approvePending,
  executePending,
}: ConfirmationPanelProps) {
  if (!intent || !route) {
    return (
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="section-label text-xs text-cyan-200">Confirmation</p>
        <p className="mt-4 text-sm text-slate-400">
          Select a route to inspect approvals, fees, minimum received, and destination-chain warnings before execution.
        </p>
      </section>
    );
  }

  const approvalReady = !preflight?.approvalRequired || Boolean(approvalHash);
  const hasBlockingWarning = preflight ? !preflight.ok : true;

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label text-xs text-cyan-200">Confirmation</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {intent.requestedAmount} {intent.fromToken.symbol} on {intent.fromChain.name} to {intent.toToken.symbol} on {intent.toChain.name}
          </h2>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200">{route.route.steps.length} route steps</div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Minimum received</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {route.summary.toAmountMinFormatted} {intent.toToken.symbol}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimated total cost</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatUsd(route.summary.totalCostUsd)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ETA</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatEta(route.summary.durationSeconds)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Approval policy</p>
          <p className="mt-2 text-lg font-semibold text-white">{preflight?.approvalRequired ? 'Exact approval' : 'No approval needed'}</p>
        </div>
      </div>
      {preflight?.warnings.length ? (
        <div className="mt-6 space-y-3">
          {preflight.warnings.map((warning) => (
            <div
              key={warning.id}
              className={cn(
                'rounded-2xl border px-4 py-3 text-sm',
                warning.severity === 'error'
                  ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                  : 'border-amber-300/20 bg-amber-300/10 text-amber-100',
              )}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">{warning.title}</p>
                  <p className="mt-1 opacity-90">{warning.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {preflight?.approvalRequired ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={approvePending}
            className="rounded-full border border-cyan-300/35 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approvePending ? 'Approving exact amount...' : approvalHash ? 'Approval confirmed' : 'Approve exact ERC-20 amount'}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="size-4" />
            No token approval required
          </div>
        )}
        <button
          type="button"
          onClick={onExecute}
          disabled={executePending || hasBlockingWarning || !approvalReady}
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {executePending ? 'Executing route...' : 'Confirm and execute route'}
        </button>
        <p className="text-sm text-slate-400">Execution only starts after wallet confirmation. Each route step is logged and persisted for recovery.</p>
      </div>
    </section>
  );
}
