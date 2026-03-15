import { STATIC_CHAIN_ALIASES } from '@/lib/chains/aliases';
import type { SupportedChainInfo } from '@/types/agent';

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildAliasSet(chain: SupportedChainInfo) {
  const aliases = new Set<string>([
    chain.name,
    chain.key,
    chain.coin,
    normalizeLabel(chain.name),
    normalizeLabel(chain.key),
    normalizeLabel(chain.coin),
  ]);

  const staticAliases = STATIC_CHAIN_ALIASES[normalizeLabel(chain.name)] ?? [];

  for (const alias of staticAliases) {
    aliases.add(alias);
    aliases.add(normalizeLabel(alias));
  }

  return aliases;
}

export function resolveChainReference(input: string, chains: SupportedChainInfo[]) {
  const normalizedInput = normalizeLabel(input);

  const exactMatch = chains.find((chain) => buildAliasSet(chain).has(normalizedInput));

  if (exactMatch) {
    return {
      status: 'resolved' as const,
      chain: exactMatch,
      matches: [exactMatch],
    };
  }

  const partialMatches = chains.filter((chain) => {
    const aliases = buildAliasSet(chain);
    return [...aliases].some((alias) => alias.includes(normalizedInput) || normalizedInput.includes(alias));
  });

  if (partialMatches.length === 1) {
    return {
      status: 'resolved' as const,
      chain: partialMatches[0],
      matches: partialMatches,
    };
  }

  return {
    status: partialMatches.length > 1 ? ('ambiguous' as const) : ('not_found' as const),
    chain: null,
    matches: partialMatches,
  };
}

export function getChainAliasCandidates(chains: SupportedChainInfo[]) {
  return chains.flatMap((chain) => [...buildAliasSet(chain)]);
}
