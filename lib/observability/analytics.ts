import { logEvent } from '@/lib/observability/logger';

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  logEvent('analytics', name, properties, 'debug');
}
