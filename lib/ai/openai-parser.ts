import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import type { ParsedSwapIntent, SupportedChainInfo } from '@/types/agent';
import { env, isServerOpenAiConfigured } from '@/lib/config/env';
import { logEvent } from '@/lib/observability/logger';
import { parsedIntentSchema } from '@/lib/ai/schema';

function buildInstructions(chains: SupportedChainInfo[]) {
  const chainNames = chains.map((chain) => chain.name).join(', ');

  return [
    'You extract swap, bridge, and quote intents for a non-custodial cross-chain agent.',
    'Do not invent chain IDs, addresses, balances, approvals, or route viability.',
    'Use only details that are explicit in the prompt. If information is missing or ambiguous, set clarificationNeeded=true and add clarification questions.',
    'Use routePreference=cheapest or fastest only when the prompt explicitly asks for it.',
    'If the user says "all" or "my balance", set amountMode=all and amount="ALL".',
    'If the user asks for a quote or route comparison, set actionType=quote and dryRunOnly=true.',
    `Known chain names include: ${chainNames}.`,
  ].join(' ');
}

export async function parsePromptWithOpenAi(rawPrompt: string, chains: SupportedChainInfo[]) {
  if (!isServerOpenAiConfigured()) {
    return null;
  }

  const client = new OpenAI({
    apiKey: env.openAiApiKey,
  });

  const response = await client.responses.parse({
    model: env.openAiModel,
    input: [
      {
        role: 'system',
        content: buildInstructions(chains),
      },
      {
        role: 'user',
        content: rawPrompt,
      },
    ],
    text: {
      format: zodTextFormat(parsedIntentSchema, 'swap_intent'),
    },
  });

  logEvent('ai', 'OpenAI parser completed', {
    model: env.openAiModel,
  }, 'debug');

  return response.output_parsed as ParsedSwapIntent | null;
}
