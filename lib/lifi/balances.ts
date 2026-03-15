import { getWalletBalances } from '@lifi/sdk';
import { parseUnits } from 'viem';

import { logEvent } from '@/lib/observability/logger';
import { isNativeTokenAddress } from '@/lib/tokens/resolver';
import type { ResolvedIntent, SupportedChainInfo } from '@/types/agent';

const DEFAULT_NATIVE_GAS_RESERVE = '0.003';

export async function fetchWalletBalances(address: string) {
  const balances = await getWalletBalances(address);

  logEvent('balances', 'Fetched wallet balances', {
    chainCount: Object.keys(balances).length,
  }, 'debug');

  return balances;
}

export function findTokenBalance(
  balances: Awaited<ReturnType<typeof fetchWalletBalances>>,
  chainId: number,
  tokenAddress: string,
) {
  const chainBalances = balances[chainId] ?? [];
  return chainBalances.find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase()) ?? null;
}

export function findNativeBalance(
  balances: Awaited<ReturnType<typeof fetchWalletBalances>>,
  chain: SupportedChainInfo,
) {
  const chainBalances = balances[chain.id] ?? [];
  return (
    chainBalances.find(
      (token) =>
        token.address.toLowerCase() === chain.nativeToken.address.toLowerCase() ||
        token.symbol.toLowerCase() === chain.nativeToken.symbol.toLowerCase(),
    ) ?? null
  );
}

export function resolveAllAmountAtomic(intent: ResolvedIntent, balanceAmount: string) {
  if (!isNativeTokenAddress(intent.fromToken.address)) {
    return balanceAmount;
  }

  const reserve = parseUnits(DEFAULT_NATIVE_GAS_RESERVE, intent.fromToken.decimals);
  const safeBalance = BigInt(balanceAmount);

  if (safeBalance <= reserve) {
    return '0';
  }

  return (safeBalance - reserve).toString();
}
