import type { SupportedChainInfo } from '@/types/agent';

function normalizeBaseUrl(url?: string) {
  if (!url) {
    return null;
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getExplorerTransactionUrl(chain: SupportedChainInfo | null | undefined, txHash?: string) {
  const baseUrl = normalizeBaseUrl(chain?.explorerUrls[0]);

  if (!baseUrl || !txHash) {
    return null;
  }

  return `${baseUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chain: SupportedChainInfo | null | undefined, address?: string) {
  const baseUrl = normalizeBaseUrl(chain?.explorerUrls[0]);

  if (!baseUrl || !address) {
    return null;
  }

  return `${baseUrl}/address/${address}`;
}
