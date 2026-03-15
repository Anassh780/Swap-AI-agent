'use client';

import { History } from 'lucide-react';

import { shortenAddress } from '@/lib/utils/format';
import type { PersistedExecutionRecord } from '@/types/agent';

type HistoryPanelProps = {
  history: PersistedExecutionRecord[];
};

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex items-center gap-3">
        <History className="size-5 text-cyan-300" />
        <div>
          <p className="section-label text-xs text-cyan-200">Recent activity</p>
          <p className="mt-1 text-sm text-slate-400">Local execution history persists across refreshes for recovery and audits.</p>
        </div>
      </div>
      {history.length ? (
        <div className="mt-5 space-y-3">
          {history.map((record) => (
            <div key={record.id} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">
                    {record.intent.fromToken.symbol} {record.intent.fromChain.name} to {record.intent.toToken.symbol} {record.intent.toChain.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Route {shortenAddress(record.routeId, 8, 6)} • {new Date(record.updatedAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{record.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">No local swap history yet.</p>
      )}
    </section>
  );
}
