import { describe, expect, it } from 'vitest';

import { canTransitionExecutionStatus } from '@/lib/execution/state-machine';

describe('canTransitionExecutionStatus', () => {
  it('allows approval before confirmation', () => {
    expect(canTransitionExecutionStatus('awaiting-approval', 'approved')).toBe(true);
  });

  it('blocks execution from a completed state', () => {
    expect(canTransitionExecutionStatus('completed', 'executing')).toBe(false);
  });
});
