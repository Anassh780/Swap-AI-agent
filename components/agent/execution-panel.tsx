'use client';

import { ExternalLink, LoaderCircle, PlayCircle, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import type { PersistedExecutionRecord } from '@/types/agent';

type ExecutionPanelProps = {
  record: PersistedExecutionRecord | null;
  onResume: () => void;
  onClear: () => void;
  isResuming?: boolean;
};

export function ExecutionPanel({ record, onResume, onClear, isResuming }: ExecutionPanelProps) {
  if (!record) {
    return (
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="section-label text-xs text-cyan-200">Execution status</p>
        <p className="mt-4 text-sm text-slate-400">Active route execution appears here, including refresh recovery and step-by-step transaction state.</p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label text-xs text-cyan-200">Execution status</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{record.status.replace(/-/g, ' ')}</h3>
          <p className="mt-2 text-sm text-slate-400">Route {record.routeId} • Updated {new Date(record.updatedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {record.canResume ? (
            <button
              type="button"
              onClick={onResume}
              disabled={isResuming}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResuming ? <LoaderCircle className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Resume
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-rose-300/30 hover:text-white"
          >
            <Trash2 className="size-4" />
            Clear
          </button>
        </div>
      </div>
      {record.error ? (
        <div className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium">{record.error.code}</p>
          <p className="mt-1">{record.error.guidance}</p>
        </div>
      ) : null}
      <div className="mt-6 space-y-3">
        {record.events.length ? (
          record.events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{event.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{event.detail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]',
                      event.status === 'done'
                        ? 'bg-emerald-300/15 text-emerald-100'
                        : event.status === 'error'
                          ? 'bg-rose-300/15 text-rose-100'
                          : 'bg-cyan-300/15 text-cyan-100',
                    )}
                  >
                    {event.status}
                  </span>
                  {event.txLink ? (
                    <a href={event.txLink} target="_blank" rel="noreferrer" className="text-cyan-200 transition hover:text-white">
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Waiting for execution events.</p>
        )}
      </div>
    </section>
  );
}
