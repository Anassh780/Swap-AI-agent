import type { ParsedSwapIntent, SupportedChainInfo } from '@/types/agent';

import { buildClarificationQuestions } from '@/lib/ai/clarifications';
import { normalizeIntent } from '@/lib/ai/normalize';
import { parsePromptHeuristically } from '@/lib/ai/heuristic-parser';
import { parsePromptWithOpenAi } from '@/lib/ai/openai-parser';
import { captureException } from '@/lib/observability/error-reporting';
import { logEvent } from '@/lib/observability/logger';

function mergeIntents(primary: ParsedSwapIntent, secondary?: ParsedSwapIntent | null) {
  if (!secondary) {
    return primary;
  }

  const preferred = secondary.parserConfidence >= primary.parserConfidence ? secondary : primary;
  const fallback = preferred === secondary ? primary : secondary;

  const merged = normalizeIntent({
    ...fallback,
    ...preferred,
    fromChain: preferred.fromChain ?? fallback.fromChain,
    toChain: preferred.toChain ?? fallback.toChain,
    fromToken: preferred.fromToken ?? fallback.fromToken,
    toToken: preferred.toToken ?? fallback.toToken,
    amount: preferred.amount ?? fallback.amount,
    clarificationQuestions: [...new Set([...(preferred.clarificationQuestions ?? []), ...(fallback.clarificationQuestions ?? [])])],
    reasoning: [...new Set([...(preferred.reasoning ?? []), ...(fallback.reasoning ?? [])])],
  });

  merged.clarificationQuestions = buildClarificationQuestions(merged);
  merged.clarificationNeeded = merged.clarificationQuestions.length > 0;
  merged.parserConfidence = Math.min(0.99, Math.max(preferred.parserConfidence, fallback.parserConfidence));

  return merged;
}

export async function parsePromptIntent(rawPrompt: string, chains: SupportedChainInfo[]) {
  const heuristicIntent = parsePromptHeuristically(rawPrompt, chains);

  try {
    const llmIntent = await parsePromptWithOpenAi(rawPrompt, chains);
    const mergedIntent = mergeIntents(heuristicIntent, llmIntent);

    logEvent('ai', 'Intent parsed', {
      parserConfidence: mergedIntent.parserConfidence,
      clarificationNeeded: mergedIntent.clarificationNeeded,
      actionType: mergedIntent.actionType,
    }, 'debug');

    return mergedIntent;
  } catch (error) {
    captureException(error, {
      scope: 'parsePromptIntent',
      prompt: rawPrompt,
    });

    return heuristicIntent;
  }
}
