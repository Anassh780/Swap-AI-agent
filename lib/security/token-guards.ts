import type { ResolvedToken, SafetyAlert } from '@/types/agent';

export function getTokenSafetyAlerts(token: ResolvedToken) {
  const alerts: SafetyAlert[] = [];
  const lowerName = token.name.toLowerCase();

  if (lowerName.includes('test') || lowerName.includes('fake')) {
    alerts.push({
      id: `token-${token.address}-name`,
      severity: 'warning',
      title: 'Token name needs verification',
      message: `${token.symbol} looks like a testing or imitation asset. Verify the contract address before executing.`,
      code: 'MALICIOUS_TOKEN',
      actionable: true,
    });
  }

  if (!token.logoURI) {
    alerts.push({
      id: `token-${token.address}-logo`,
      severity: 'info',
      title: 'Token metadata is sparse',
      message: `${token.symbol} has limited metadata in the LI.FI token registry. Double-check the address in the confirmation step.`,
      code: 'UNKNOWN',
    });
  }

  return alerts;
}
