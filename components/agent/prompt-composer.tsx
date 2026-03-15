'use client';

import { Bot, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const EXAMPLES = [
  'Swap 0.5 ETH on Base to USDC on Arbitrum',
  'Bridge 250 USDC from Ethereum to Optimism',
  'Move all my WETH on Arbitrum to SOL on Solana if the route is under 1% total cost',
  'Find the cheapest route to move 1000 USDC from Base to Ethereum',
];

type PromptComposerProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isPending?: boolean;
};

export function PromptComposer({ prompt, onPromptChange, onSubmit, isPending }: PromptComposerProps) {
  return (
    <section className="glass-panel overflow-hidden rounded-[2rem]">
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="section-label text-xs text-cyan-200">Intent input</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Type the transfer you want, then confirm every deterministic step before anything executes.
            </h1>
          </div>
          <div className="hidden rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 md:block">
            No silent signing
          </div>
        </div>
      </div>
      <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Bot className="size-4 text-cyan-300" />
              Natural-language prompt
            </span>
            <textarea
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Swap 1 ETH on Ethereum to USDC on Base"
              className="min-h-40 w-full rounded-[1.4rem] border border-white/10 bg-slate-950/80 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onPromptChange(example)}
                className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending || !prompt.trim()}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition',
                'disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400',
              )}
            >
              <Sparkles className="size-4" />
              {isPending ? 'Parsing and quoting...' : 'Parse prompt'}
            </button>
            <p className="text-sm text-slate-400">
              The parser can draft intent, but balances, routes, and execution safety come from deterministic LI.FI and wallet responses.
            </p>
          </div>
        </div>
        <div className="rounded-[1.6rem] border border-white/8 bg-slate-900/40 p-5">
          <p className="section-label text-xs text-cyan-200">Flow guardrails</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Connect a non-custodial wallet. Private keys never leave the wallet.</li>
            <li>Review the parsed intent. Ambiguous prompts are blocked until clarified.</li>
            <li>Compare LI.FI routes by cost, ETA, and tool path.</li>
            <li>Approve exact ERC-20 allowances unless you intentionally choose otherwise later.</li>
            <li>Execute only after explicit approval in the confirmation panel.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
