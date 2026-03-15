import { formatDistanceStrict } from 'date-fns';
import { formatUnits } from 'viem';

export function formatUsd(value?: number | string | null) {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (!Number.isFinite(numericValue ?? Number.NaN)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: numericValue && numericValue < 1 ? 4 : 2,
  }).format(numericValue ?? 0);
}

export function formatPercent(value?: number | null, fractionDigits = 2) {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 'N/A';
  }

  return `${(value ?? 0).toFixed(fractionDigits)}%`;
}

export function formatTokenAmount(amount: bigint | string | number | null | undefined, decimals = 18, maximumFractionDigits = 6) {
  if (amount === null || amount === undefined) {
    return '0';
  }

  const normalized =
    typeof amount === 'bigint' ? formatUnits(amount, decimals) : typeof amount === 'number' ? amount.toString() : amount;

  const numericValue = Number.parseFloat(normalized);

  if (!Number.isFinite(numericValue)) {
    return normalized;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(numericValue);
}

export function shortenAddress(value?: string | null, prefix = 6, suffix = 4) {
  if (!value) {
    return 'Disconnected';
  }

  if (value.length <= prefix + suffix) {
    return value;
  }

  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}

export function formatEta(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return 'N/A';
  }

  const now = Date.now();
  return formatDistanceStrict(now, now + seconds * 1000);
}

export function parseLooseNumber(value?: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
