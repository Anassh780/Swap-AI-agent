import { env } from '@/lib/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logEvent(scope: string, message: string, metadata?: Record<string, unknown>, level: LogLevel = 'info') {
  if (!env.enableDebug && level === 'debug') {
    return;
  }

  const payload = {
    scope,
    message,
    ...metadata,
  };

  const logger =
    level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;

  logger(`[swap-agent:${scope}] ${message}`, payload);
}
