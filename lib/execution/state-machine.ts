import type { ExecutionLifecycleStatus } from '@/types/agent';

const STATUS_FLOW: Record<ExecutionLifecycleStatus, ExecutionLifecycleStatus[]> = {
  idle: ['validating', 'awaiting-confirmation'],
  validating: ['awaiting-approval', 'awaiting-confirmation', 'failed'],
  'awaiting-approval': ['approved', 'failed'],
  approved: ['awaiting-confirmation', 'failed'],
  'awaiting-confirmation': ['executing', 'failed', 'stopped'],
  executing: ['completed', 'failed', 'stopped'],
  completed: [],
  failed: ['validating', 'awaiting-approval', 'awaiting-confirmation'],
  stopped: ['awaiting-confirmation', 'executing'],
};

export function canTransitionExecutionStatus(current: ExecutionLifecycleStatus, next: ExecutionLifecycleStatus) {
  return STATUS_FLOW[current].includes(next);
}
