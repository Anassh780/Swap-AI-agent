import { getToken, getTokens } from '@lifi/sdk';

import type { SupportedChainInfo, ResolvedToken } from '@/types/agent';
import { WRAPPED_NATIVE_ALIASES } from '@/lib/tokens/aliases';

function normalizeTokenLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toResolvedToken(token: Awaited<ReturnType<typeof getToken>>, resolvedVia: ResolvedToken['resolvedVia'], nativeSymbol: string) {
  return {
    ...token,
    isNative: token.symbol.toLowerCase() === nativeSymbol.toLowerCase() || /^0x0+$/.test(token.address),
    resolvedVia,
  } satisfies ResolvedToken;
}

export async function searchTokensForChain(chainId: number, query: string) {
  const response = await getTokens({
    chains: [chainId],
    extended: true,
    search: query,
    limit: 40,
  });

  return response.tokens[chainId] ?? [];
}

export async function resolveTokenReference(chain: SupportedChainInfo, input: string) {
  const normalizedInput = normalizeTokenLabel(input);
  const nativeAliases = WRAPPED_NATIVE_ALIASES[chain.nativeToken.symbol] ?? [];
  const isNativeAlias =
    normalizedInput === normalizeTokenLabel(chain.nativeToken.symbol) ||
    normalizedInput === normalizeTokenLabel(chain.nativeToken.name) ||
    nativeAliases.some((alias) => normalizeTokenLabel(alias) === normalizedInput);

  if (isNativeAlias) {
    return {
      status: 'resolved' as const,
      token: {
        ...chain.nativeToken,
        isNative: true,
        resolvedVia: 'symbol' as const,
      },
      matches: [chain.nativeToken],
    };
  }

  try {
    const directMatch = await getToken(chain.id, input);
    return {
      status: 'resolved' as const,
      token: toResolvedToken(directMatch, /^0x[a-fA-F0-9]{40}$/.test(input) ? 'address' : 'symbol', chain.nativeToken.symbol),
      matches: [directMatch],
    };
  } catch {
    const searchResults = await searchTokensForChain(chain.id, input);
    const exactMatches = searchResults.filter((token) => {
      const normalizedSymbol = normalizeTokenLabel(token.symbol);
      const normalizedName = normalizeTokenLabel(token.name);
      const normalizedAddress = token.address.toLowerCase();

      return (
        normalizedSymbol === normalizedInput ||
        normalizedName === normalizedInput ||
        normalizedAddress === input.toLowerCase()
      );
    });

    if (exactMatches.length === 1) {
      const match = exactMatches[0];

      if (!match) {
        return {
          status: 'not_found' as const,
          token: null,
          matches: searchResults.slice(0, 8),
        };
      }

      return {
        status: 'resolved' as const,
        token: toResolvedToken(match, 'name', chain.nativeToken.symbol),
        matches: exactMatches,
      };
    }

    return {
      status: exactMatches.length > 1 ? ('ambiguous' as const) : ('not_found' as const),
      token: null,
      matches: exactMatches.length > 1 ? exactMatches : searchResults.slice(0, 8),
    };
  }
}

export function isNativeTokenAddress(address: string) {
  return /^0x0+$/.test(address);
}
