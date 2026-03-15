import { parseUnits } from 'viem';

import { resolveChainReference } from '@/lib/chains/resolver';
import { isDiscoveryOnlyChain, isEvmChain } from '@/lib/chains/type-guards';
import { checkAllowanceRequired } from '@/lib/lifi/allowance';
import { fetchWalletBalances, findNativeBalance, findTokenBalance, resolveAllAmountAtomic } from '@/lib/lifi/balances';
import { getTokenSafetyAlerts } from '@/lib/security/token-guards';
import { resolveTokenReference } from '@/lib/tokens/resolver';
import type { AppRouteOption, ParsedSwapIntent, PreflightCheck, ResolvedIntent, SafetyAlert, SupportedChainInfo } from '@/types/agent';

function buildAlert(partial: Omit<SafetyAlert, 'id'>): SafetyAlert {
  return {
    id: `${partial.code}-${partial.title}-${partial.message}`,
    ...partial,
  };
}

export async function resolveIntentForExecution(parsedIntent: ParsedSwapIntent, chains: SupportedChainInfo[], walletAddress: string) {
  if (parsedIntent.clarificationNeeded) {
    return {
      status: 'clarify' as const,
      alerts: parsedIntent.clarificationQuestions.map((question) =>
        buildAlert({
          severity: 'warning',
          title: 'Clarification required',
          message: question,
          code: 'PARSER_AMBIGUITY',
          actionable: true,
        }),
      ),
    };
  }

  if (!parsedIntent.fromChain || !parsedIntent.toChain || !parsedIntent.fromToken || !parsedIntent.toToken) {
    return {
      status: 'clarify' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Intent is incomplete',
          message: 'Source chain, destination chain, source token, and destination token are all required before quoting.',
          code: 'PARSER_AMBIGUITY',
          actionable: true,
        }),
      ],
    };
  }

  const fromChainResolution = resolveChainReference(parsedIntent.fromChain.raw, chains);
  const toChainResolution = resolveChainReference(parsedIntent.toChain.raw, chains);

  if (fromChainResolution.status !== 'resolved' || !fromChainResolution.chain) {
    return {
      status: 'clarify' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Source chain not recognized',
          message: `We could not confidently resolve "${parsedIntent.fromChain.raw}" to a supported chain.`,
          code: 'CHAIN_UNSUPPORTED',
          actionable: true,
        }),
      ],
    };
  }

  if (toChainResolution.status !== 'resolved' || !toChainResolution.chain) {
    return {
      status: 'clarify' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Destination chain not recognized',
          message: `We could not confidently resolve "${parsedIntent.toChain.raw}" to a supported chain.`,
          code: 'CHAIN_UNSUPPORTED',
          actionable: true,
        }),
      ],
    };
  }

  if (!isEvmChain(fromChainResolution.chain) || !isEvmChain(toChainResolution.chain)) {
    return {
      status: 'unsupported' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Non-EVM execution is not enabled yet',
          message: 'This build resolves non-EVM chains for discovery and explanation, but only executes EVM source and destination flows in the current release.',
          code: 'NON_EVM_DESTINATION',
          actionable: false,
        }),
      ],
    };
  }

  if (isDiscoveryOnlyChain(fromChainResolution.chain) || isDiscoveryOnlyChain(toChainResolution.chain)) {
    return {
      status: 'unsupported' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Chain is discoverable but not executable',
          message: 'The chain is supported for discovery through LI.FI, but the current wallet runtime is not configured to execute on it yet.',
          code: 'CHAIN_UNSUPPORTED',
        }),
      ],
    };
  }

  const [fromTokenResolution, toTokenResolution] = await Promise.all([
    resolveTokenReference(fromChainResolution.chain, parsedIntent.fromToken.raw),
    resolveTokenReference(toChainResolution.chain, parsedIntent.toToken.raw),
  ]);

  if (fromTokenResolution.status !== 'resolved' || !fromTokenResolution.token) {
    return {
      status: 'clarify' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Source token needs confirmation',
          message: `We found multiple or no matches for "${parsedIntent.fromToken.raw}" on ${fromChainResolution.chain.name}.`,
          code: 'TOKEN_UNSUPPORTED',
          actionable: true,
        }),
      ],
    };
  }

  if (toTokenResolution.status !== 'resolved' || !toTokenResolution.token) {
    return {
      status: 'clarify' as const,
      alerts: [
        buildAlert({
          severity: 'warning',
          title: 'Destination token needs confirmation',
          message: `We found multiple or no matches for "${parsedIntent.toToken.raw}" on ${toChainResolution.chain.name}.`,
          code: 'TOKEN_UNSUPPORTED',
          actionable: true,
        }),
      ],
    };
  }

  const balances = await fetchWalletBalances(walletAddress);
  const sourceBalance = findTokenBalance(balances, fromChainResolution.chain.id, fromTokenResolution.token.address);
  const nativeBalance = findNativeBalance(balances, fromChainResolution.chain);
  const warnings = [...getTokenSafetyAlerts(fromTokenResolution.token), ...getTokenSafetyAlerts(toTokenResolution.token)];

  if (!sourceBalance?.amount) {
    return {
      status: 'blocked' as const,
      alerts: [
        ...warnings,
        buildAlert({
          severity: 'error',
          title: 'Insufficient source balance',
          message: `No ${fromTokenResolution.token.symbol} balance was detected on ${fromChainResolution.chain.name}.`,
          code: 'INSUFFICIENT_BALANCE',
          actionable: true,
        }),
      ],
    };
  }

  const amountAtomic =
    parsedIntent.amountMode === 'all'
      ? resolveAllAmountAtomic(
          {
            ...parsedIntent,
            fromChain: fromChainResolution.chain,
            toChain: toChainResolution.chain,
            fromToken: fromTokenResolution.token,
            toToken: toTokenResolution.token,
            requestedAmount: 'ALL',
            amountAtomic: sourceBalance.amount,
            warnings,
          },
          sourceBalance.amount,
        )
      : parsedIntent.amount
        ? parseUnits(parsedIntent.amount, fromTokenResolution.token.decimals).toString()
        : null;

  if (!amountAtomic || BigInt(amountAtomic) <= 0n) {
    return {
      status: 'blocked' as const,
      alerts: [
        ...warnings,
        buildAlert({
          severity: 'error',
          title: 'Amount is too small',
          message: 'The requested amount leaves no transferable balance after reserving source-chain gas.',
          code: 'INSUFFICIENT_GAS',
        }),
      ],
    };
  }

  if (BigInt(sourceBalance.amount) < BigInt(amountAtomic)) {
    return {
      status: 'blocked' as const,
      alerts: [
        ...warnings,
        buildAlert({
          severity: 'error',
          title: 'Insufficient token balance',
          message: `The wallet balance is lower than the requested ${fromTokenResolution.token.symbol} amount.`,
          code: 'INSUFFICIENT_BALANCE',
        }),
      ],
    };
  }

  if (!nativeBalance?.amount || BigInt(nativeBalance.amount) === 0n) {
    warnings.push(
      buildAlert({
        severity: 'warning',
        title: 'Source-chain gas is missing',
        message: `No ${fromChainResolution.chain.nativeToken.symbol} balance was detected for gas on ${fromChainResolution.chain.name}. Execution will likely fail until the wallet is funded.`,
        code: 'INSUFFICIENT_GAS',
        actionable: true,
      }),
    );
  }

  const resolvedIntent: ResolvedIntent = {
    ...parsedIntent,
    fromChain: fromChainResolution.chain,
    toChain: toChainResolution.chain,
    fromToken: fromTokenResolution.token,
    toToken: toTokenResolution.token,
    requestedAmount: parsedIntent.amount ?? 'ALL',
    amountAtomic,
    balanceAtomic: sourceBalance.amount,
    warnings,
  };

  return {
    status: 'resolved' as const,
    intent: resolvedIntent,
    balances,
    nativeBalance,
    sourceBalance,
    alerts: warnings,
  };
}

export async function runPreflightChecks(intent: ResolvedIntent, routeOption: AppRouteOption, walletAddress: string): Promise<PreflightCheck> {
  const balances = await fetchWalletBalances(walletAddress);
  const sourceBalance = findTokenBalance(balances, intent.fromChain.id, intent.fromToken.address);
  const nativeBalance = findNativeBalance(balances, intent.fromChain);
  const allowance = await checkAllowanceRequired(intent, walletAddress, routeOption.summary.approvalAddress);
  const warnings: SafetyAlert[] = [...intent.warnings, ...routeOption.warnings];

  if (!nativeBalance?.amount || BigInt(nativeBalance.amount) === 0n) {
    warnings.push(
      buildAlert({
        severity: 'warning',
        title: 'Source-chain gas is low',
        message: `Add ${intent.fromChain.nativeToken.symbol} to cover approval and route execution gas.`,
        code: 'INSUFFICIENT_GAS',
        actionable: true,
      }),
    );
  }

  if (!sourceBalance?.amount || BigInt(sourceBalance.amount) < BigInt(intent.amountAtomic)) {
    warnings.push(
      buildAlert({
        severity: 'error',
        title: 'Balance changed',
        message: 'The wallet balance changed after parsing. Refresh the quote before executing.',
        code: 'INSUFFICIENT_BALANCE',
        actionable: true,
      }),
    );
  }

  return {
    ok: !warnings.some((warning) => warning.severity === 'error'),
    warnings,
    approvalRequired: allowance.required,
    estimatedGasUsd: routeOption.summary.gasCostUsd ?? null,
    nativeBalance,
    sourceBalance,
  };
}
