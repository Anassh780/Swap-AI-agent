import { getRoutes } from '@lifi/sdk';
import type { Route } from '@lifi/types';
import { formatUnits, parseUnits } from 'viem';

import { env } from '@/lib/config/env';
import { ensureLifiConfig } from '@/lib/lifi/config';
import { logEvent } from '@/lib/observability/logger';
import type { AppRouteOption, ResolvedIntent, RoutePreference, RouteSummary, SafetyAlert, SupportedChainInfo } from '@/types/agent';

const ORDER_MAP: Record<RoutePreference, 'CHEAPEST' | 'FASTEST' | undefined> = {
  cheapest: 'CHEAPEST',
  fastest: 'FASTEST',
  recommended: undefined,
};

function summarizeSteps(route: Route): RouteSummary {
  const toolNames = new Set<string>();
  const bridgeNames = new Set<string>();
  let gasCostUsd = 0;
  let feeCostUsd = 0;
  let durationSeconds = 0;

  for (const step of route.steps) {
    toolNames.add(step.toolDetails.name);
    durationSeconds += step.estimate?.executionDuration ?? 0;

    for (const includedStep of step.includedSteps ?? []) {
      toolNames.add(includedStep.toolDetails.name);
      if (includedStep.type === 'cross') {
        bridgeNames.add(includedStep.toolDetails.name);
      }
    }

    for (const gasCost of step.estimate?.gasCosts ?? []) {
      gasCostUsd += Number.parseFloat(gasCost.amountUSD ?? '0');
    }

    for (const feeCost of step.estimate?.feeCosts ?? []) {
      feeCostUsd += Number.parseFloat(feeCost.amountUSD ?? '0');
    }
  }

  const firstStep = route.steps[0];

  return {
    toAmount: route.toAmount,
    toAmountMin: route.toAmountMin,
    toAmountFormatted: formatUnits(BigInt(route.toAmount), route.toToken.decimals),
    toAmountMinFormatted: formatUnits(BigInt(route.toAmountMin), route.toToken.decimals),
    fromAmountFormatted: formatUnits(BigInt(route.fromAmount), route.fromToken.decimals),
    fromAmountUsd: route.fromAmountUSD ? Number.parseFloat(route.fromAmountUSD) : null,
    toAmountUsd: route.toAmountUSD ? Number.parseFloat(route.toAmountUSD) : null,
    gasCostUsd: Number.isFinite(gasCostUsd) ? gasCostUsd : null,
    totalCostUsd: Number.isFinite(gasCostUsd + feeCostUsd) ? gasCostUsd + feeCostUsd : null,
    feeCostUsd: Number.isFinite(feeCostUsd) ? feeCostUsd : null,
    durationSeconds,
    toolNames: [...toolNames],
    bridgeNames: [...bridgeNames],
    tags: route.tags?.map((tag) => tag.toLowerCase()) ?? [],
    requiresApproval: Boolean(firstStep?.estimate?.approvalAddress && route.fromToken.address !== '0x0000000000000000000000000000000000000000'),
    approvalAddress: firstStep?.estimate?.approvalAddress,
  };
}

function rankRoute(route: Route, summary: RouteSummary, preference: RoutePreference) {
  if (preference === 'cheapest') {
    return summary.totalCostUsd ?? Number.MAX_SAFE_INTEGER;
  }

  if (preference === 'fastest') {
    return summary.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  }

  const recommendedBonus = route.tags?.includes('RECOMMENDED') ? -1000 : route.tags?.includes('CHEAPEST') ? -500 : 0;
  return (summary.totalCostUsd ?? Number.MAX_SAFE_INTEGER) + (summary.durationSeconds ?? 0) / 120 + recommendedBonus;
}

function validateRouteConstraints(summary: RouteSummary, intent: ResolvedIntent): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];

  if (intent.maxFeeUsd !== null && summary.totalCostUsd !== null && summary.totalCostUsd > intent.maxFeeUsd) {
      alerts.push({
        id: `${intent.rawPrompt}-fee`,
        severity: 'warning',
        title: 'Route exceeds fee cap',
        message: `This route is estimated at ${(summary.totalCostUsd ?? 0).toFixed(2)} USD, above your ${intent.maxFeeUsd.toFixed(2)} USD limit.`,
        code: 'ROUTE_CONSTRAINT',
        actionable: true,
      });
  }

  if (intent.maxTotalCostBps !== null && summary.totalCostUsd !== null && summary.fromAmountUsd) {
    const totalCostBps = (summary.totalCostUsd / summary.fromAmountUsd) * 10_000;

    if (totalCostBps > intent.maxTotalCostBps) {
      alerts.push({
        id: `${intent.rawPrompt}-percent`,
        severity: 'warning',
        title: 'Route exceeds total-cost threshold',
        message: `Estimated costs are ${(totalCostBps / 100).toFixed(2)}% of the input value, above your ${(intent.maxTotalCostBps / 100).toFixed(2)}% cap.`,
        code: 'ROUTE_CONSTRAINT',
        actionable: true,
      });
    }
  }

  if (intent.minReceived) {
    const minimumRequired = parseUnits(intent.minReceived, intent.toToken.decimals);
    if (BigInt(summary.toAmountMin) < minimumRequired) {
      alerts.push({
        id: `${intent.rawPrompt}-minimum`,
        severity: 'warning',
        title: 'Minimum output not met',
        message: 'The route minimum received amount is below the threshold requested in your prompt.',
        code: 'ROUTE_CONSTRAINT',
        actionable: true,
      });
    }
  }

  return alerts;
}

export async function fetchRouteOptions(intent: ResolvedIntent, supportedChains: SupportedChainInfo[], fromAddress: string) {
  ensureLifiConfig(supportedChains);

  const response = await getRoutes({
    fromChainId: intent.fromChain.id,
    toChainId: intent.toChain.id,
    fromAmount: intent.amountAtomic,
    fromTokenAddress: intent.fromToken.address,
    toTokenAddress: intent.toToken.address,
    fromAddress,
    toAddress: intent.recipientAddress ?? fromAddress,
    options: {
      integrator: env.lifiIntegrator,
      order: ORDER_MAP[intent.routePreference],
      slippage: (intent.slippageBps ?? env.defaultSlippageBps) / 10_000,
      bridges: intent.allowedTools.length || intent.deniedTools.length ? { allow: intent.allowedTools, deny: intent.deniedTools } : undefined,
      exchanges: intent.allowedTools.length || intent.deniedTools.length ? { allow: intent.allowedTools, deny: intent.deniedTools } : undefined,
      allowDestinationCall: false,
    },
  });

  const normalizedRoutes = response.routes
    .map((route) => {
      const summary = summarizeSteps(route);
      const warnings = validateRouteConstraints(summary, intent);

      return {
        id: route.id,
        route,
        summary,
        warnings,
        preferenceTag: 'secondary' as const,
        score: rankRoute(route, summary, intent.routePreference),
      } satisfies AppRouteOption;
    })
    .sort((left, right) => left.score - right.score)
    .map((route, index) => ({
      ...route,
      preferenceTag: (index === 0 ? intent.routePreference : 'secondary') as AppRouteOption['preferenceTag'],
    }));

  logEvent('routes', 'Fetched route options', {
    count: normalizedRoutes.length,
    preference: intent.routePreference,
  }, 'debug');

  return {
    routes: normalizedRoutes,
    unavailableRoutes: response.unavailableRoutes,
  };
}
