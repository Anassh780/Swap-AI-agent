# Atlas Swap Agent

Atlas Swap Agent is a production-oriented, confirmation-first cross-chain swap app built with Next.js, TypeScript, wagmi, viem, and the LI.FI SDK.

## What it does

- Connects non-custodial wallets with injected providers, Safe, Coinbase Wallet, and WalletConnect.
- Parses natural-language swap and bridge prompts into a strongly typed intent model.
- Resolves chains and tokens deterministically against live LI.FI metadata.
- Fetches and ranks LI.FI routes by cheapest, fastest, or recommended policy.
- Checks balances, gas posture, and exact-token approval requirements before execution.
- Executes LI.FI routes only after explicit confirmation.
- Tracks execution progress, persists recent history, and supports resume-after-refresh flows.

## Stack

- Next.js App Router
- React 19
- TypeScript strict mode
- Tailwind CSS
- wagmi + viem
- LI.FI SDK
- TanStack Query
- Zustand
- Zod
- Optional OpenAI parser enhancement
- Optional Sentry client/server reporting

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in at least:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_RPC_URL_MAP`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_LIFI_INTEGRATOR`

3. Optionally add:

- `OPENAI_API_KEY` for higher-quality prompt extraction
- `NEXT_PUBLIC_SENTRY_DSN` for error reporting

4. Run the app:

```bash
npm run dev
```

5. Validate locally:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Environment notes

- Wallet signing stays client-side only.
- Private keys are never stored server-side.
- The OpenAI integration is optional and only used for prompt understanding. Chain IDs, balances, tokens, routes, approvals, and execution remain deterministic.
- `NEXT_PUBLIC_RPC_URL_MAP` is intentionally public because the browser-side LI.FI execution stack needs chain RPC access.

## Current execution boundary

- EVM-to-EVM execution is the primary supported path in this release.
- Non-EVM chains such as Solana are dynamically discoverable and can be parsed and surfaced in the UI, but execution is blocked with an explicit explanation until matching wallet/runtime providers are added.

## Project structure

- `app/`: routes, API endpoint, layouts, metadata assets
- `components/agent/`: prompt, review, route selection, confirmation, execution, history UI
- `lib/ai/`: parser orchestration, schema validation, heuristic fallback, optional OpenAI parser
- `lib/chains/`: chain metadata, alias resolution, explorer helpers
- `lib/tokens/`: token lookup and ambiguity handling
- `lib/lifi/`: SDK config, route normalization, balances, approvals, execution
- `lib/execution/`: preflight validation, state transitions, failure normalization
- `lib/wallet/`: wagmi config, wallet provider bridge, session helpers
- `stores/`: persisted execution history and settings
- `tests/`: unit coverage for deterministic agent logic

## Manual testing checklist

1. Connect an injected wallet and refresh the page to confirm reconnection works.
2. Parse `Swap 0.5 ETH on Base to USDC on Arbitrum`.
3. Edit the parsed intent fields and refresh routes.
4. Compare route cards with `recommended`, `cheapest`, and `fastest`.
5. Use an ERC-20 source token and confirm the exact-approval flow appears.
6. Execute a route and verify step updates, explorer links, and persisted history.
7. Refresh mid-execution and confirm the resume control appears.
8. Try an unsupported prompt like `Move all my WETH on Arbitrum to SOL on Solana` and verify the app explains the current execution boundary.
9. Try a low-gas wallet and confirm the warning appears before execution.
10. Disconnect and reconnect the wallet cleanly.

## Future expansion

- Add Solana and Bitcoin wallet providers, then register LI.FI SVM/UTXO providers beside the EVM provider.
- Extend intent resolution to support recipient-address overrides, exact-output quoting, and tool allow/deny editing from the UI.
- Add server-backed analytics/session storage for team visibility beyond local persistence.
- Introduce richer token risk feeds and route simulation diagnostics.
