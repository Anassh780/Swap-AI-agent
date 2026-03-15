import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parsePromptIntent } from '@/lib/ai/parser';
import { fetchSupportedChains } from '@/lib/chains/metadata';
import { captureException } from '@/lib/observability/error-reporting';

const requestSchema = z.object({
  prompt: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const chains = await fetchSupportedChains();
    const intent = await parsePromptIntent(body.prompt, chains);

    return NextResponse.json({
      intent,
    });
  } catch (error) {
    captureException(error, {
      scope: 'api.intent',
    });

    return NextResponse.json(
      {
        message: 'Failed to parse prompt intent.',
      },
      {
        status: 500,
      },
    );
  }
}
