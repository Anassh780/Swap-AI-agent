export const WALLET_SESSION_KEY = 'swap-agent.wallet-session';

export type StoredWalletSession = {
  lastKnownChainId?: number;
  lastKnownAddress?: string;
};

export function persistWalletSession(session: StoredWalletSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
}

export function readWalletSession(): StoredWalletSession {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(WALLET_SESSION_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StoredWalletSession;
  } catch {
    return {};
  }
}
