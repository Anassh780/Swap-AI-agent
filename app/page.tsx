import { SwapAgentApp } from '@/components/agent/swap-agent-app';
import { AppShell } from '@/components/layout/app-shell';

export default function HomePage() {
  return (
    <AppShell>
      <SwapAgentApp />
    </AppShell>
  );
}
