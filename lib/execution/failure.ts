import type { NormalizedExecutionError } from '@/types/agent';

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Unknown execution error.';
}

export function normalizeExecutionError(error: unknown): NormalizedExecutionError {
  const message = errorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('user rejected') || lowerMessage.includes('4001')) {
    return {
      code: 'USER_REJECTED',
      message,
      recoverable: true,
      guidance: 'The wallet request was rejected. Review the route details and try again when you are ready to sign.',
    };
  }

  if (lowerMessage.includes('insufficient allowance')) {
    return {
      code: 'INSUFFICIENT_ALLOWANCE',
      message,
      recoverable: true,
      guidance: 'Approve the token amount again and retry execution.',
    };
  }

  if (lowerMessage.includes('insufficient balance')) {
    return {
      code: 'INSUFFICIENT_BALANCE',
      message,
      recoverable: false,
      guidance: 'Fund the wallet or reduce the amount before restarting the swap.',
    };
  }

  if (lowerMessage.includes('out of gas')) {
    return {
      code: 'OUT_OF_GAS',
      message,
      recoverable: true,
      guidance: 'Add source-chain gas tokens and retry the route from the start.',
    };
  }

  return {
    code: 'EXECUTION_FAILED',
    message,
    recoverable: true,
    guidance: 'Review the latest step state, then retry or restart with a fresh quote if the route is stale.',
  };
}
