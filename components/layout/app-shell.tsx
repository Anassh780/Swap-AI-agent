import type { ReactNode } from 'react';

import { TopNav } from '@/components/layout/top-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(76,161,175,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(255,196,83,0.16),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#091321_40%,_#050915_100%)] text-slate-100">
      <TopNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">{children}</main>
    </div>
  );
}
