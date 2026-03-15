import { z } from 'zod';

export const intentEntitySchema = z
  .object({
    raw: z.string().min(1),
    normalized: z.string().min(1),
    symbol: z.string().optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    chainHint: z.string().nullable().optional(),
  })
  .strict();

export const parsedIntentSchema = z
  .object({
    actionType: z.enum(['swap', 'bridge', 'quote']).default('swap'),
    fromChain: intentEntitySchema.nullable().default(null),
    toChain: intentEntitySchema.nullable().default(null),
    fromToken: intentEntitySchema.nullable().default(null),
    toToken: intentEntitySchema.nullable().default(null),
    amount: z.string().nullable().default(null),
    amountType: z.enum(['exactIn', 'exactOut']).default('exactIn'),
    amountMode: z.enum(['fixed', 'all']).default('fixed'),
    fromAddress: z.string().nullable().default(null),
    recipientAddress: z.string().nullable().default(null),
    slippageBps: z.number().int().nullable().default(null),
    routePreference: z.enum(['cheapest', 'fastest', 'recommended']).default('recommended'),
    maxFeeUsd: z.number().nullable().default(null),
    maxTotalCostBps: z.number().int().nullable().default(null),
    minReceived: z.string().nullable().default(null),
    allowedTools: z.array(z.string()).default([]),
    deniedTools: z.array(z.string()).default([]),
    allowedChains: z.array(z.string()).default([]),
    deniedChains: z.array(z.string()).default([]),
    executionMode: z.literal('confirm-first').default('confirm-first'),
    rawPrompt: z.string().min(1),
    parserConfidence: z.number().min(0).max(1).default(0.5),
    clarificationNeeded: z.boolean().default(false),
    clarificationQuestions: z.array(z.string()).default([]),
    reasoning: z.array(z.string()).default([]),
    dryRunOnly: z.boolean().default(false),
  })
  .strict();

export type ParsedIntentSchema = z.infer<typeof parsedIntentSchema>;
