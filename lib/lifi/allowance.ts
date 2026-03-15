import { getTokenAllowance, setTokenAllowance } from '@lifi/sdk';
import type { WalletClient } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';

import { logEvent } from '@/lib/observability/logger';
import { isNativeTokenAddress } from '@/lib/tokens/resolver';
import type { ResolvedIntent } from '@/types/agent';

export function isAllowanceApprovalRequired(currentAllowance: bigint | null | undefined, requiredAmount: string, tokenAddress: string, approvalAddress?: string) {
  if (!approvalAddress || isNativeTokenAddress(tokenAddress)) {
    return false;
  }

  return (currentAllowance ?? 0n) < BigInt(requiredAmount);
}

export async function checkAllowanceRequired(intent: ResolvedIntent, ownerAddress: string, approvalAddress?: string) {
  if (!approvalAddress || isNativeTokenAddress(intent.fromToken.address)) {
    return {
      required: false,
      allowance: null,
    };
  }

  const allowance = await getTokenAllowance(intent.fromToken, ownerAddress as `0x${string}`, approvalAddress as `0x${string}`);
  const required = isAllowanceApprovalRequired(allowance, intent.amountAtomic, intent.fromToken.address, approvalAddress);

  return {
    required,
    allowance: allowance?.toString() ?? null,
  };
}

export async function approveExactTokenAmount(walletClient: WalletClient, intent: ResolvedIntent, approvalAddress: string) {
  const hash = await setTokenAllowance({
    walletClient,
    token: intent.fromToken,
    spenderAddress: approvalAddress,
    amount: BigInt(intent.amountAtomic),
  });

  if (!hash) {
    return null;
  }

  await waitForTransactionReceipt(walletClient, {
    hash,
  });

  logEvent('allowance', 'Approval transaction confirmed', {
    hash,
    token: intent.fromToken.symbol,
  }, 'debug');

  return hash;
}
