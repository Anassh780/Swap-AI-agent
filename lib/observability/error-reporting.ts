import * as Sentry from '@sentry/nextjs';

import { env } from '@/lib/config/env';

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (env.sentryDsn) {
    Sentry.captureException(error, {
      extra: context,
    });
    return;
  }

  console.error('[swap-agent:error]', error, context);
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (env.sentryDsn) {
    Sentry.captureMessage(message, {
      extra: context,
    });
    return;
  }

  console.warn('[swap-agent:message]', message, context);
}
