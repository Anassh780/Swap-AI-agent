import type { ParsedSwapIntent } from '@/types/agent';

export function buildClarificationQuestions(intent: ParsedSwapIntent) {
  const questions: string[] = [];

  if (!intent.fromChain) {
    questions.push('Which source chain should we use?');
  }

  if (!intent.toChain) {
    questions.push('Which destination chain should receive the assets?');
  }

  if (!intent.fromToken) {
    questions.push('Which asset are you sending from the source chain?');
  }

  if (!intent.toToken) {
    questions.push('Which asset should you receive on the destination chain?');
  }

  if (!intent.amount && intent.amountMode !== 'all') {
    questions.push('How much should be swapped or bridged?');
  }

  if (intent.amountMode === 'all' && !intent.fromToken) {
    questions.push('Which token balance should “all” refer to?');
  }

  if (intent.parserConfidence < 0.6) {
    questions.push('Please confirm the parsed intent details before execution.');
  }

  return [...new Set(questions)];
}
