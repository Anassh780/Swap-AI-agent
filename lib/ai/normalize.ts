import type { ParsedSwapIntent } from '@/types/agent';

export function normalizeEntity(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return {
    raw: rawValue.trim(),
    normalized,
  };
}

export function clampConfidence(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeIntent(intent: ParsedSwapIntent): ParsedSwapIntent {
  return {
    ...intent,
    parserConfidence: clampConfidence(intent.parserConfidence),
    clarificationQuestions: [...new Set(intent.clarificationQuestions.filter(Boolean))],
    allowedTools: [...new Set(intent.allowedTools.map((value) => value.toLowerCase()))],
    deniedTools: [...new Set(intent.deniedTools.map((value) => value.toLowerCase()))],
    allowedChains: [...new Set(intent.allowedChains.map((value) => value.toLowerCase()))],
    deniedChains: [...new Set(intent.deniedChains.map((value) => value.toLowerCase()))],
    reasoning: [...new Set(intent.reasoning.filter(Boolean))],
  };
}
