import type { ChainType, ExtendedChain, Route, RouteExtended, Token, WalletTokenExtended } from '@lifi/sdk';

export type AgentActionType = 'swap' | 'bridge' | 'quote';
export type AmountType = 'exactIn' | 'exactOut';
export type RoutePreference = 'cheapest' | 'fastest' | 'recommended';
export type ExecutionMode = 'confirm-first';
export type AmountMode = 'fixed' | 'all';
export type ExecutionLifecycleStatus =
  | 'idle'
  | 'validating'
  | 'awaiting-approval'
  | 'approved'
  | 'awaiting-confirmation'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'stopped';
export type Severity = 'info' | 'warning' | 'error';

export interface IntentEntityInput {
  raw: string;
  normalized: string;
  symbol?: string;
  name?: string;
  address?: string;
  chainHint?: string | null;
}

export interface SafetyAlert {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  code:
    | 'PARSER_AMBIGUITY'
    | 'CHAIN_UNSUPPORTED'
    | 'TOKEN_UNSUPPORTED'
    | 'INSUFFICIENT_BALANCE'
    | 'INSUFFICIENT_GAS'
    | 'APPROVAL_REQUIRED'
    | 'HIGH_SLIPPAGE'
    | 'NON_EVM_DESTINATION'
    | 'ROUTE_CONSTRAINT'
    | 'MALICIOUS_TOKEN'
    | 'UNKNOWN';
  actionable?: boolean;
}

export interface ParsedSwapIntent {
  actionType: AgentActionType;
  fromChain: IntentEntityInput | null;
  toChain: IntentEntityInput | null;
  fromToken: IntentEntityInput | null;
  toToken: IntentEntityInput | null;
  amount: string | null;
  amountType: AmountType;
  amountMode: AmountMode;
  fromAddress: string | null;
  recipientAddress: string | null;
  slippageBps: number | null;
  routePreference: RoutePreference;
  maxFeeUsd: number | null;
  maxTotalCostBps: number | null;
  minReceived: string | null;
  allowedTools: string[];
  deniedTools: string[];
  allowedChains: string[];
  deniedChains: string[];
  executionMode: ExecutionMode;
  rawPrompt: string;
  parserConfidence: number;
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  reasoning: string[];
  dryRunOnly: boolean;
}

export interface SupportedChainInfo {
  id: number;
  key: string;
  name: string;
  chainType: ChainType;
  mainnet: boolean;
  coin: string;
  logoURI?: string;
  explorerUrls: string[];
  rpcUrls: string[];
  nativeToken: Token;
  supportLevel: 'fully-supported' | 'discovery-only';
  raw: ExtendedChain;
}

export interface ResolvedToken extends Token {
  isNative: boolean;
  resolvedVia: 'symbol' | 'address' | 'name' | 'coinKey';
}

export interface ResolvedIntent extends Omit<ParsedSwapIntent, 'fromChain' | 'toChain' | 'fromToken' | 'toToken' | 'amount'> {
  fromChain: SupportedChainInfo;
  toChain: SupportedChainInfo;
  fromToken: ResolvedToken;
  toToken: ResolvedToken;
  requestedAmount: string;
  amountAtomic: string;
  balanceAtomic?: string;
  warnings: SafetyAlert[];
}

export interface RouteSummary {
  toAmount: string;
  toAmountMin: string;
  toAmountFormatted: string;
  toAmountMinFormatted: string;
  fromAmountFormatted: string;
  fromAmountUsd: number | null;
  toAmountUsd: number | null;
  gasCostUsd: number | null;
  totalCostUsd: number | null;
  feeCostUsd: number | null;
  durationSeconds: number | null;
  toolNames: string[];
  bridgeNames: string[];
  tags: string[];
  requiresApproval: boolean;
  approvalAddress?: string;
}

export interface AppRouteOption {
  id: string;
  route: Route;
  summary: RouteSummary;
  warnings: SafetyAlert[];
  preferenceTag: RoutePreference | 'secondary';
  score: number;
}

export interface PreflightCheck {
  ok: boolean;
  warnings: SafetyAlert[];
  approvalRequired: boolean;
  estimatedGasUsd?: number | null;
  nativeBalance?: WalletTokenExtended | null;
  sourceBalance?: WalletTokenExtended | null;
}

export interface ExecutionEvent {
  id: string;
  at: number;
  label: string;
  detail: string;
  status: ExecutionLifecycleStatus | 'pending' | 'done' | 'error';
  txHash?: string;
  txLink?: string;
}

export interface NormalizedExecutionError {
  code: string;
  message: string;
  recoverable: boolean;
  guidance: string;
}

export interface PersistedExecutionRecord {
  id: string;
  routeId: string;
  intent: ResolvedIntent;
  route: RouteExtended | Route;
  status: ExecutionLifecycleStatus;
  createdAt: number;
  updatedAt: number;
  events: ExecutionEvent[];
  error?: NormalizedExecutionError;
  routePreference: RoutePreference;
  explorerLinks: string[];
  canResume: boolean;
}

export interface WalletSessionSnapshot {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
}
