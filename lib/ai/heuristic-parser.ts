import type { ParsedSwapIntent, SupportedChainInfo } from '@/types/agent';

import { buildClarificationQuestions } from '@/lib/ai/clarifications';
import { normalizeEntity, normalizeIntent } from '@/lib/ai/normalize';
import { parsedIntentSchema } from '@/lib/ai/schema';
import { STATIC_CHAIN_ALIASES } from '@/lib/chains/aliases';
import { sanitizePrompt } from '@/lib/security/prompt';
import { parseLooseNumber } from '@/lib/utils/format';

type ChainMention = {
  chain: SupportedChainInfo;
  alias: string;
  index: number;
  end: number;
};

const TOKEN_PATTERN = /0x[a-fA-F0-9]{40}|[A-Za-z][A-Za-z0-9.]{1,32}/g;

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getChainAliases(chain: SupportedChainInfo) {
  return [...new Set([chain.name, chain.key, chain.coin, ...(STATIC_CHAIN_ALIASES[normalizeLabel(chain.name)] ?? [])])];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findChainMentions(prompt: string, chains: SupportedChainInfo[]) {
  const mentions: ChainMention[] = [];
  const lowerPrompt = prompt.toLowerCase();

  for (const chain of chains) {
    for (const alias of getChainAliases(chain).sort((left, right) => right.length - left.length)) {
      const expression = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'g');
      const match = expression.exec(lowerPrompt);

      if (!match || match.index === undefined) {
        continue;
      }

      mentions.push({
        chain,
        alias,
        index: match.index,
        end: match.index + alias.length,
      });
      break;
    }
  }

  return mentions.sort((left, right) => left.index - right.index);
}

function extractTokenFromSegment(segment: string) {
  const matches = [...segment.matchAll(TOKEN_PATTERN)].map((match) => match[0]);
  const filtered = matches.filter(
    (value) =>
      !['swap', 'bridge', 'quote', 'move', 'from', 'into', 'turn', 'convert', 'route', 'on', 'my', 'balance', 'all', 'the', 'if']
        .includes(value.toLowerCase()),
  );

  return filtered.length ? filtered[filtered.length - 1] : null;
}

function inferActionType(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('quote') || lowerPrompt.includes('show why') || lowerPrompt.includes('show route')) {
    return 'quote' as const;
  }

  if (lowerPrompt.includes('bridge') && !lowerPrompt.includes('swap')) {
    return 'bridge' as const;
  }

  if (lowerPrompt.includes('find the cheapest route') || lowerPrompt.includes('get me the fastest route')) {
    return 'quote' as const;
  }

  return 'swap' as const;
}

function inferRoutePreference(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('cheapest')) {
    return 'cheapest' as const;
  }

  if (lowerPrompt.includes('fastest')) {
    return 'fastest' as const;
  }

  return 'recommended' as const;
}

function inferAmount(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (/\ball\b/.test(lowerPrompt) || /\bmy balance\b/.test(lowerPrompt)) {
    return {
      amountMode: 'all' as const,
      amount: 'ALL',
    };
  }

  const match = lowerPrompt.match(/\b(\d+(?:\.\d+)?)\b/);
  return {
    amountMode: 'fixed' as const,
    amount: match?.[1] ?? null,
  };
}

function inferSourceAndDestinationChains(prompt: string, chainMentions: ChainMention[]) {
  if (!chainMentions.length) {
    return {
      fromChain: null,
      toChain: null,
    };
  }

  if (chainMentions.length === 1) {
    const mention = chainMentions[0];

    if (!mention) {
      return {
        fromChain: null,
        toChain: null,
      };
    }

    const context = prompt.slice(Math.max(0, mention.index - 12), mention.end + 12).toLowerCase();

    if (context.includes('to ')) {
      return {
        fromChain: null,
        toChain: mention.chain,
      };
    }

    return {
      fromChain: mention.chain,
      toChain: null,
    };
  }

  return {
    fromChain: chainMentions[0]?.chain ?? null,
    toChain: chainMentions[1]?.chain ?? null,
  };
}

function extractSourceToken(prompt: string, firstChainMention: ChainMention | undefined) {
  if (!firstChainMention) {
    return null;
  }

  const segment = prompt.slice(0, firstChainMention.index);
  return extractTokenFromSegment(segment);
}

function extractDestinationToken(prompt: string, firstChainMention: ChainMention | undefined, secondChainMention: ChainMention | undefined) {
  if (!secondChainMention) {
    return null;
  }

  const segment = prompt.slice(firstChainMention?.end ?? 0, secondChainMention.index);
  const explicitTokenMatch = segment.match(/(?:to|into)\s+(?:my\s+)?([A-Za-z0-9.]+|0x[a-fA-F0-9]{40})/i);
  return explicitTokenMatch?.[1] ?? extractTokenFromSegment(segment);
}

function inferConstraint(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  const maxFeeMatch = lowerPrompt.match(/(?:fees?|costs?)\s+(?:stay\s+)?under\s+\$?(\d+(?:\.\d+)?)/);
  const maxPercentMatch = lowerPrompt.match(/under\s+(\d+(?:\.\d+)?)%\s+total\s+cost/);
  const minReceivedMatch = lowerPrompt.match(/(?:at least|minimum received|output is at least)\s+(\d+(?:\.\d+)?)/);
  const slippagePercentMatch = lowerPrompt.match(/slippage\s+(?:under|below|at)\s+(\d+(?:\.\d+)?)%/);
  const slippageBpsMatch = lowerPrompt.match(/slippage\s+(?:under|below|at)\s+(\d+)\s*bps/);

  return {
    maxFeeUsd: parseLooseNumber(maxFeeMatch?.[1] ?? null),
    maxTotalCostBps: maxPercentMatch?.[1] ? Math.round(Number.parseFloat(maxPercentMatch[1]) * 100) : null,
    minReceived: minReceivedMatch?.[1] ?? null,
    slippageBps: slippageBpsMatch?.[1]
      ? Number.parseInt(slippageBpsMatch[1], 10)
      : slippagePercentMatch?.[1]
        ? Math.round(Number.parseFloat(slippagePercentMatch[1]) * 100)
        : null,
  };
}

export function parsePromptHeuristically(rawPrompt: string, chains: SupportedChainInfo[]) {
  const prompt = sanitizePrompt(rawPrompt);
  const chainMentions = findChainMentions(prompt, chains);
  const { fromChain, toChain } = inferSourceAndDestinationChains(prompt, chainMentions);
  const { amount, amountMode } = inferAmount(prompt);
  const constraints = inferConstraint(prompt);
  const actionType = inferActionType(prompt);
  const routePreference = inferRoutePreference(prompt);
  const firstChainMention = chainMentions[0];
  const secondChainMention = chainMentions[1];
  const fromTokenValue = extractSourceToken(prompt, firstChainMention);
  let toTokenValue = extractDestinationToken(prompt, firstChainMention, secondChainMention);

  if (!toTokenValue && fromTokenValue && (actionType === 'bridge' || actionType === 'quote')) {
    toTokenValue = fromTokenValue;
  }

  const intent = parsedIntentSchema.parse({
    actionType,
    fromChain: fromChain ? normalizeEntity(fromChain.name) : null,
    toChain: toChain ? normalizeEntity(toChain.name) : null,
    fromToken: normalizeEntity(fromTokenValue),
    toToken: normalizeEntity(toTokenValue),
    amount,
    amountMode,
    amountType: /exactly/.test(prompt.toLowerCase()) ? 'exactOut' : 'exactIn',
    routePreference,
    maxFeeUsd: constraints.maxFeeUsd,
    maxTotalCostBps: constraints.maxTotalCostBps,
    minReceived: constraints.minReceived,
    slippageBps: constraints.slippageBps,
    rawPrompt,
    dryRunOnly: actionType === 'quote',
    parserConfidence: 0,
    clarificationNeeded: false,
    reasoning: [
      'Heuristic parser extracted chain and token candidates from the prompt structure.',
      actionType === 'quote' ? 'Execution is blocked until the user explicitly selects and confirms a route.' : 'Execution remains confirm-first.',
    ],
  }) satisfies ParsedSwapIntent;

  const filledFieldCount = [
    intent.fromChain,
    intent.toChain,
    intent.fromToken,
    intent.toToken,
    intent.amount || intent.amountMode === 'all',
  ].filter(Boolean).length;

  intent.parserConfidence = Math.min(0.96, 0.2 + filledFieldCount * 0.16 + (intent.routePreference !== 'recommended' ? 0.08 : 0));
  intent.clarificationQuestions = buildClarificationQuestions(intent);
  intent.clarificationNeeded = intent.clarificationQuestions.length > 0;

  return normalizeIntent(intent);
}
