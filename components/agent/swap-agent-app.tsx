'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSwitchChain } from 'wagmi';

import { ConfirmationPanel } from '@/components/agent/confirmation-panel';
import { ExecutionPanel } from '@/components/agent/execution-panel';
import { HistoryPanel } from '@/components/agent/history-panel';
import { IntentPreview } from '@/components/agent/intent-preview';
import { PromptComposer } from '@/components/agent/prompt-composer';
import { RouteList } from '@/components/agent/route-list';
import { fetchSupportedChains } from '@/lib/chains/metadata';
import { normalizeExecutionError } from '@/lib/execution/failure';
import { resolveIntentForExecution, runPreflightChecks } from '@/lib/execution/preflight';
import { approveExactTokenAmount } from '@/lib/lifi/allowance';
import { executeSelectedRoute, extractExecutionEvents, extractExplorerLinks, resumeSelectedRoute } from '@/lib/lifi/execution';
import { fetchRouteOptions } from '@/lib/lifi/routes';
import { captureException } from '@/lib/observability/error-reporting';
import { trackEvent } from '@/lib/observability/analytics';
import { wagmiConfig } from '@/lib/wallet/config';
import { useWalletSnapshot } from '@/lib/wallet/hooks';
import { getWalletClientForChain } from '@/lib/wallet/switch-chain';
import { useAgentStore } from '@/stores/agent-store';
import type { AppRouteOption, ParsedSwapIntent, PersistedExecutionRecord, PreflightCheck, ResolvedIntent, SafetyAlert } from '@/types/agent';

async function parseIntent(prompt: string) {
  const response = await fetch('/api/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('Prompt parsing failed.');
  }

  return (await response.json()) as { intent: ParsedSwapIntent };
}

function deriveExecutionStatus(route: PersistedExecutionRecord['route']) {
  const processes = route.steps.flatMap((step) => ('execution' in step ? step.execution?.process ?? [] : []));

  if (!processes.length) {
    return 'awaiting-confirmation' as const;
  }

  if (processes.some((process) => process.status === 'FAILED' || process.status === 'CANCELLED')) {
    return 'failed' as const;
  }

  if (processes.every((process) => process.status === 'DONE')) {
    return 'completed' as const;
  }

  if (processes.some((process) => process.status === 'ACTION_REQUIRED' || process.status === 'MESSAGE_REQUIRED')) {
    return 'awaiting-confirmation' as const;
  }

  return 'executing' as const;
}

export function SwapAgentApp() {
  const wallet = useWalletSnapshot();
  const switchChain = useSwitchChain();
  const activeExecution = useAgentStore((state) => state.activeExecution);
  const history = useAgentStore((state) => state.history);
  const setActiveExecution = useAgentStore((state) => state.setActiveExecution);
  const upsertHistory = useAgentStore((state) => state.upsertHistory);

  const [prompt, setPrompt] = useState('');
  const [intent, setIntent] = useState<ParsedSwapIntent | null>(null);
  const [resolvedIntent, setResolvedIntent] = useState<ResolvedIntent | null>(null);
  const [routeOptions, setRouteOptions] = useState<AppRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [preflight, setPreflight] = useState<PreflightCheck | null>(null);
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const chainsQuery = useQuery({
    queryKey: ['supported-chains'],
    queryFn: fetchSupportedChains,
  });

  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId) ?? null;

  async function refreshRoutes(nextIntent: ParsedSwapIntent) {
    if (!chainsQuery.data?.length) {
      return;
    }

    setApprovalHash(null);

    if (!wallet.address) {
      setAlerts([
        {
          id: 'connect-wallet',
          severity: 'warning',
          title: 'Connect a wallet to continue',
          message: 'Balances, all-balance resolution, allowance checks, and gas validation require a connected wallet.',
          code: 'UNKNOWN',
          actionable: true,
        },
      ]);
      setResolvedIntent(null);
      setRouteOptions([]);
      setSelectedRouteId(null);
      setPreflight(null);
      return;
    }

    const resolution = await resolveIntentForExecution(nextIntent, chainsQuery.data, wallet.address);
    setAlerts(resolution.alerts);

    if (resolution.status !== 'resolved' || !resolution.intent) {
      setResolvedIntent(null);
      setRouteOptions([]);
      setSelectedRouteId(null);
      setPreflight(null);
      return;
    }

    setResolvedIntent(resolution.intent);

    const routeResult = await fetchRouteOptions(resolution.intent, chainsQuery.data, wallet.address);
    setRouteOptions(routeResult.routes);
    setSelectedRouteId(routeResult.routes[0]?.id ?? null);
    trackEvent('routes_loaded', {
      count: routeResult.routes.length,
      routePreference: resolution.intent.routePreference,
    });
  }

  async function handleParsePrompt() {
    setIsParsing(true);

    try {
      const response = await parseIntent(prompt);
      setIntent(response.intent);
      await refreshRoutes(response.intent);
    } catch (error) {
      captureException(error, {
        scope: 'SwapAgentApp.handleParsePrompt',
      });
      setAlerts([
        {
          id: 'parse-error',
          severity: 'error',
          title: 'Prompt parsing failed',
          message: 'The parser could not process this request. Try rewriting the prompt with explicit source chain, destination chain, tokens, and amount.',
          code: 'UNKNOWN',
        },
      ]);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleRefreshIntent() {
    if (!intent) {
      return;
    }

    await refreshRoutes(intent);
  }

  async function handleApprove() {
    if (!resolvedIntent || !selectedRoute?.summary.approvalAddress) {
      return;
    }

    setIsApproving(true);

    try {
      if (wallet.chainId !== resolvedIntent.fromChain.id && switchChain.switchChainAsync) {
        await switchChain.switchChainAsync({
          chainId: resolvedIntent.fromChain.id,
        });
      }

      const walletClient = await getWalletClientForChain(wagmiConfig, resolvedIntent.fromChain.id);

      if (!walletClient) {
        throw new Error('No wallet client available for approval.');
      }

      const hash = await approveExactTokenAmount(walletClient, resolvedIntent, selectedRoute.summary.approvalAddress);
      setApprovalHash(hash ?? null);

      if (wallet.address) {
        const nextPreflight = await runPreflightChecks(resolvedIntent, selectedRoute, wallet.address);
        setPreflight(nextPreflight);
      }
    } catch (error) {
      const normalized = normalizeExecutionError(error);
      setAlerts([
        {
          id: 'approval-error',
          severity: 'error',
          title: 'Approval failed',
          message: normalized.guidance,
          code: 'UNKNOWN',
          actionable: true,
        },
      ]);
    } finally {
      setIsApproving(false);
    }
  }

  async function beginExecution(route: AppRouteOption, intentForExecution: ResolvedIntent) {
    const recordId = crypto.randomUUID();
    const now = Date.now();
    const baseRecord: PersistedExecutionRecord = {
      id: recordId,
      routeId: route.route.id,
      intent: intentForExecution,
      route: route.route,
      status: 'awaiting-confirmation',
      createdAt: now,
      updatedAt: now,
      events: [],
      routePreference: intentForExecution.routePreference,
      explorerLinks: [],
      canResume: true,
    };

    setActiveExecution(baseRecord);
    upsertHistory(baseRecord);

    return baseRecord;
  }

  async function handleExecute() {
    if (!resolvedIntent || !selectedRoute || !chainsQuery.data) {
      return;
    }

    setIsExecuting(true);

    try {
      if (wallet.chainId !== resolvedIntent.fromChain.id && switchChain.switchChainAsync) {
        await switchChain.switchChainAsync({
          chainId: resolvedIntent.fromChain.id,
        });
      }

      const initialRecord = await beginExecution(selectedRoute, resolvedIntent);

      const finalRoute = await executeSelectedRoute(selectedRoute.route, chainsQuery.data, (updatedRoute) => {
        const nextRecord: PersistedExecutionRecord = {
          ...initialRecord,
          route: updatedRoute,
          status: deriveExecutionStatus(updatedRoute),
          updatedAt: Date.now(),
          events: extractExecutionEvents(updatedRoute),
          explorerLinks: extractExplorerLinks(updatedRoute),
          canResume: deriveExecutionStatus(updatedRoute) !== 'completed',
        };

        setActiveExecution(nextRecord);
        upsertHistory(nextRecord);
      });

      const finalRecord: PersistedExecutionRecord = {
        ...initialRecord,
        route: finalRoute,
        status: deriveExecutionStatus(finalRoute),
        updatedAt: Date.now(),
        events: extractExecutionEvents(finalRoute),
        explorerLinks: extractExplorerLinks(finalRoute),
        canResume: false,
      };

      setActiveExecution(finalRecord);
      upsertHistory(finalRecord);
      trackEvent('route_executed', {
        routeId: finalRecord.routeId,
      });
    } catch (error) {
      const normalized = normalizeExecutionError(error);
      const failedRecord =
        activeExecution && resolvedIntent
          ? {
              ...activeExecution,
              status: 'failed' as const,
              updatedAt: Date.now(),
              error: normalized,
              canResume: normalized.recoverable,
            }
          : null;

      if (failedRecord) {
        setActiveExecution(failedRecord);
        upsertHistory(failedRecord);
      }

      setAlerts([
        {
          id: 'execution-error',
          severity: 'error',
          title: 'Execution failed',
          message: normalized.guidance,
          code: 'UNKNOWN',
          actionable: true,
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleResume() {
    if (!activeExecution || !chainsQuery.data) {
      return;
    }

    setIsResuming(true);

    try {
      const finalRoute = await resumeSelectedRoute(activeExecution.route, chainsQuery.data, (updatedRoute) => {
        const nextRecord: PersistedExecutionRecord = {
          ...activeExecution,
          route: updatedRoute,
          status: deriveExecutionStatus(updatedRoute),
          updatedAt: Date.now(),
          events: extractExecutionEvents(updatedRoute),
          explorerLinks: extractExplorerLinks(updatedRoute),
          canResume: deriveExecutionStatus(updatedRoute) !== 'completed',
        };

        setActiveExecution(nextRecord);
        upsertHistory(nextRecord);
      });

      const nextRecord: PersistedExecutionRecord = {
        ...activeExecution,
        route: finalRoute,
        status: deriveExecutionStatus(finalRoute),
        updatedAt: Date.now(),
        events: extractExecutionEvents(finalRoute),
        explorerLinks: extractExplorerLinks(finalRoute),
        canResume: deriveExecutionStatus(finalRoute) !== 'completed',
      };

      setActiveExecution(nextRecord);
      upsertHistory(nextRecord);
    } catch (error) {
      const normalized = normalizeExecutionError(error);
      setActiveExecution(
        activeExecution
          ? {
              ...activeExecution,
              status: 'failed',
              updatedAt: Date.now(),
              error: normalized,
              canResume: normalized.recoverable,
            }
          : null,
      );
    } finally {
      setIsResuming(false);
    }
  }

  useEffect(() => {
    if (!wallet.address || !resolvedIntent || !selectedRoute) {
      setPreflight(null);
      return;
    }

    runPreflightChecks(resolvedIntent, selectedRoute, wallet.address)
      .then(setPreflight)
      .catch((error) => {
        captureException(error, {
          scope: 'SwapAgentApp.runPreflightChecks',
        });
      });
  }, [wallet.address, resolvedIntent, selectedRoute]);

  return (
    <div className="grid gap-6">
      <PromptComposer prompt={prompt} onPromptChange={setPrompt} onSubmit={handleParsePrompt} isPending={isParsing} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <IntentPreview
          intent={intent}
          supportedChains={chainsQuery.data ?? []}
          alerts={alerts}
          onIntentChange={(nextIntent) => setIntent(nextIntent)}
          onRefresh={handleRefreshIntent}
          isPending={isParsing}
        />
        <RouteList routes={routeOptions} selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ConfirmationPanel
          intent={resolvedIntent}
          route={selectedRoute}
          preflight={preflight}
          approvalHash={approvalHash}
          onApprove={handleApprove}
          onExecute={handleExecute}
          approvePending={isApproving}
          executePending={isExecuting}
        />
        <ExecutionPanel
          record={activeExecution}
          onResume={handleResume}
          onClear={() => setActiveExecution(null)}
          isResuming={isResuming}
        />
      </div>
      <HistoryPanel history={history} />
    </div>
  );
}
