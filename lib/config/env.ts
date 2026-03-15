import { z } from 'zod';

import type { RoutePreference } from '@/types/agent';

const routePreferenceSchema = z.enum(['cheapest', 'fastest', 'recommended']);

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_LIFI_INTEGRATOR: z.string().optional(),
  NEXT_PUBLIC_LIFI_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(5000).optional(),
  NEXT_PUBLIC_DEFAULT_ROUTE_PREFERENCE: routePreferenceSchema.optional(),
  NEXT_PUBLIC_ENABLE_DEBUG: z.string().optional(),
  NEXT_PUBLIC_RPC_URL_MAP: z.string().optional(),
  NEXT_PUBLIC_TOKEN_LIST_URLS: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
});

function parseJsonArray(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseRpcUrlMap(value?: string) {
  if (!value) {
    return {} as Record<number, string[]>;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string | string[]>;

    return Object.entries(parsed).reduce<Record<number, string[]>>((accumulator, [chainId, urls]) => {
      const numericChainId = Number.parseInt(chainId, 10);

      if (!Number.isFinite(numericChainId)) {
        return accumulator;
      }

      accumulator[numericChainId] = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function getBooleanFlag(value?: string) {
  return value === '1' || value === 'true';
}

const rawEnv = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_LIFI_INTEGRATOR: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR,
  NEXT_PUBLIC_LIFI_API_URL: process.env.NEXT_PUBLIC_LIFI_API_URL,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_DEFAULT_SLIPPAGE_BPS: process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE_BPS,
  NEXT_PUBLIC_DEFAULT_ROUTE_PREFERENCE: process.env.NEXT_PUBLIC_DEFAULT_ROUTE_PREFERENCE as
    | RoutePreference
    | undefined,
  NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
  NEXT_PUBLIC_RPC_URL_MAP: process.env.NEXT_PUBLIC_RPC_URL_MAP,
  NEXT_PUBLIC_TOKEN_LIST_URLS: process.env.NEXT_PUBLIC_TOKEN_LIST_URLS,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
});

export const env = {
  appName: rawEnv.NEXT_PUBLIC_APP_NAME ?? 'Atlas Swap Agent',
  appUrl: rawEnv.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  lifiIntegrator: rawEnv.NEXT_PUBLIC_LIFI_INTEGRATOR ?? 'atlas-swap-agent',
  lifiApiUrl: rawEnv.NEXT_PUBLIC_LIFI_API_URL,
  walletConnectProjectId: rawEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  defaultSlippageBps: rawEnv.NEXT_PUBLIC_DEFAULT_SLIPPAGE_BPS ?? 50,
  defaultRoutePreference:
    rawEnv.NEXT_PUBLIC_DEFAULT_ROUTE_PREFERENCE ?? ('recommended' satisfies RoutePreference),
  enableDebug: getBooleanFlag(rawEnv.NEXT_PUBLIC_ENABLE_DEBUG),
  rpcUrlMap: parseRpcUrlMap(rawEnv.NEXT_PUBLIC_RPC_URL_MAP),
  tokenListUrls: parseJsonArray(rawEnv.NEXT_PUBLIC_TOKEN_LIST_URLS),
  sentryDsn: rawEnv.NEXT_PUBLIC_SENTRY_DSN ?? '',
  analyticsWriteKey: rawEnv.NEXT_PUBLIC_ANALYTICS_WRITE_KEY ?? '',
  openAiApiKey: rawEnv.OPENAI_API_KEY ?? '',
  openAiModel: rawEnv.OPENAI_MODEL ?? 'gpt-5-mini',
};

export function isServerOpenAiConfigured() {
  return Boolean(env.openAiApiKey);
}
