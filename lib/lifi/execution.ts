import { executeRoute, getActiveRoute, resumeRoute } from '@lifi/sdk';
import type { Route } from '@lifi/types';
import type { RouteExtended } from '@lifi/sdk';

import { ensureLifiConfig } from '@/lib/lifi/config';
import { logEvent } from '@/lib/observability/logger';
import type { ExecutionEvent, SupportedChainInfo } from '@/types/agent';

function processStatusToEventStatus(status: string): ExecutionEvent['status'] {
  if (status === 'DONE') {
    return 'done';
  }

  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'error';
  }

  return 'pending';
}

export function extractExecutionEvents(route: Route | RouteExtended) {
  const events: ExecutionEvent[] = [];

  for (const step of route.steps) {
    const processes = 'execution' in step ? step.execution?.process ?? [] : [];

    for (const process of processes) {
      events.push({
        id: `${step.id}-${process.type}-${process.status}-${process.txHash ?? process.startedAt}`,
        at: process.doneAt ?? process.pendingAt ?? process.startedAt,
        label: `${step.toolDetails.name} ${process.type.toLowerCase().replace(/_/g, ' ')}`,
        detail: process.message ?? process.substatus ?? process.status,
        status: processStatusToEventStatus(process.status),
        txHash: process.txHash,
        txLink: process.txLink,
      });
    }
  }

  return events.sort((left, right) => left.at - right.at);
}

export function extractExplorerLinks(route: Route | RouteExtended) {
  const links = new Set<string>();

  for (const step of route.steps) {
    const processes = 'execution' in step ? step.execution?.process ?? [] : [];

    for (const process of processes) {
      if (process.txLink) {
        links.add(process.txLink);
      }
    }
  }

  return [...links];
}

export async function executeSelectedRoute(
  route: Route,
  supportedChains: SupportedChainInfo[],
  onRouteUpdate: (route: RouteExtended) => void,
) {
  ensureLifiConfig(supportedChains);

  logEvent('execution', 'Executing route', {
    routeId: route.id,
  }, 'debug');

  return executeRoute(route, {
    executeInBackground: true,
    updateRouteHook: onRouteUpdate,
  });
}

export async function resumeSelectedRoute(
  route: Route,
  supportedChains: SupportedChainInfo[],
  onRouteUpdate: (route: RouteExtended) => void,
) {
  ensureLifiConfig(supportedChains);

  return resumeRoute(route, {
    executeInBackground: true,
    updateRouteHook: onRouteUpdate,
  });
}

export function getKnownActiveRoute(routeId: string) {
  return getActiveRoute(routeId);
}
