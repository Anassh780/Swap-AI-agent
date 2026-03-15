import { AppShell } from '@/components/layout/app-shell';
import { fetchSupportedChains } from '@/lib/chains/metadata';

export default async function SupportedPage() {
  const chains = await fetchSupportedChains();

  return (
    <AppShell>
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="section-label text-xs text-cyan-200">Supported chains</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Dynamic chain discovery from LI.FI</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          The app fetches chain metadata dynamically from LI.FI. EVM chains are executable in this release, while non-EVM chains remain visible so the agent can explain support boundaries and future expansion paths honestly.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {chains.map((chain) => (
            <div key={chain.id} className="rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{chain.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {chain.chainType} • {chain.coin}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{chain.supportLevel}</span>
              </div>
              <div className="mt-4 text-sm text-slate-300">
                <p>Native token: {chain.nativeToken.symbol}</p>
                <p className="mt-1">Explorer: {chain.explorerUrls[0] ?? 'Unavailable'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
