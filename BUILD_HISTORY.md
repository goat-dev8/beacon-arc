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

## 2026-10-08 — Phase 4: Arc mainnet deploy and two real transactions

- **Phase:** deploy factory, registry, one vault, then a real send and a real revert.
- **Local simulation of `USDC.transfer` failed** with `OpcodeNotFound` on precompile `0x1800…0000`. That is the Arc native-coin precompile, which Foundry's local EVM does not implement. The same transfer was broadcast with `cast` and succeeded on mainnet. Do not treat a local USDC simulation failure as a mainnet failure.
- **Registry:** `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` tx `0x59c050bfb502b8a85a8313123deecadfc5ef1e3dc753cb66c66fcbf06d811b4b`
- **Factory:** `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` tx `0xd2e73417d1749893d8780e46b1d8b85233c10d2198c3d3e779ec74cd0d5b98b5`
- **setFactory:** `0x9009746863ba97497e60bae0142fbdd19c594cc00cb6db5bc1bceb5362563fcf`
- **Vault:** `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` create tx `0x414b610b6bb2fca6e15d03cf4da77a092b37a54ff0b34bb7e213ba3e98c83c83`
- **Owner:** `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`
- **Executor:** `0x412045b7c64d471DE57024f11E080289e6082172`
- **Agent signer:** `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`
- **Send 0.01 USDC:** `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` status `0x1`. Vault ERC-20 balance after the send: 10000.
- **Over-cap revert:** `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` status `0x0`, error selector `0x342fa66d` (`OverCap`). Gas estimation refused the tx; it was published with an explicit gas limit so the revert is on chain.
- **Code sizes:** registry 1149, factory 6413, vault 5047. On-chain `owner`, `executor`, and `usdc` match.
- **Source verification:** `forge verify-contract` against `https://explorer.arc.io/api` failed because Cloudflare returned an HTML challenge instead of JSON. Bytecode is on chain. Source is not marked verified.
- **Evidence:** `evidence/deployment.json`
- **Env names added:** `AGENT_PRIVATE_KEY`, `BEACON_VAULT_FACTORY`, `BEACON_RECEIPT_REGISTRY`.
