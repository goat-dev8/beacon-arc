# Beacon Arc — build history

Do not delete entries. Do not put secret values in this file.

## 2026-10-08 — Security revision before code

- **Phase:** plan revision (Parts 2A–2J).
- **Objective:** stop the executor from being the financial authority.
- **Decision:** owner registers an agent address and a recipient allowlist. The agent signs an EIP-712 action. The executor only submits that signature. The vault calls `USDC.transfer` itself. A database bearer does not move funds.
- **Swap decision:** no arbitrary Universal Router commands. Swap, when enabled, is Uniswap V2 `swapExactTokensForTokens` with output forced to the vault.
- **Privacy:** not executable. No private-transfer function.
- **PQ:** precompile exists as `0xef` at `0x1800…0004`. ABI not pinned. Not in the first vault. Not a PQ wallet.
- **CCTP:** `BURNED` is not complete. Not in the first deploy.
- **Repo:** https://github.com/goat-dev8/beacon-arc
- **Plan file updated:** `ARC_BEACON_EXECUTION_PLAN.md` section 3.1.
- **Result:** revision recorded. Implementation starts at Phase 0 probes and contracts.

## 2026-10-08 — Phase 0 probes and first vault

- **Phase:** 0 probes, then the send vault.
- **Chain:** `eth_chainId` `0x13b2` (5042) on `https://rpc.mainnet.arc.io`.
- **Code sizes:** USDC 1798, EURC 1798, Uniswap V2 router 21902, CCTP TokenMessenger 2175, PQ precompile 1 byte.
- **Deployer:** `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`. Native balance `1400000000000000000` base units (1.4 at 18 decimals).
- **Executor:** `0x412045b7c64d471DE57024f11E080289e6082172`. No gas yet.
- **Contracts:** `BeaconUsdcVault`, `BeaconVaultFactory`, `BeaconReceiptRegistry`.
- **Tests:** `forge test` — 12 passed, 0 failed.
- **What the tests cover:** exact USDC send, recipient mutation, unknown recipient, blocked recipient, replay, over cap, executor withdraw, stranger execute, revoked grant, pause, policy-version mismatch, window cap.
- **Env names written (values not recorded here):** `CHAIN_ID`, `ARC_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `EXECUTOR_PRIVATE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `GITHUB_TOKEN`, `RENDER_API_KEY`, `VERCEL_TOKEN`, `SESSION_SECRET`.
- **Evidence:** `evidence/phase0-probes.json`.
- **Not done yet:** mainnet deploy, API, MCP, frontend, swap, CCTP, ERC-8004, x402.

## 2026-10-08 — Phases 1–3: workspace, decimals, vault tests

- **Phase:** 1 repository skeleton, 2 decimal library, 3 contract tests expanded.
- **Push:** `7d4d6af` reached `origin/main` on `goat-dev8/beacon-arc` after the GitHub token was replaced. The previous token was rejected.
- **Node tests:** 6 passed (units + ban guard).
- **Forge tests:** 20 passed, 0 failed, including 256 fuzz runs that keep `windowSpent <= windowLimit`.
- **Extra attacks covered:** executor cannot set policy, pause, or recipients; past deadline; ETH value on execute; wrong token; altered amount; second factory create; stranger registry write.
- **USDC `decimals()`:** 6. Deployer ERC-20 balance `1400000` (1.4 USDC). This is the same pool as the 18-decimal native balance. Gas price `0x4b0159b8d` (above the 20 Gwei floor).
- **Implementation root:** `d:\route\Flare\arc`, not a nested `beacon/` folder.
- **Not deployed yet.**
