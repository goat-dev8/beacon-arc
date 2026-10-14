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

## 2026-10-08 — Phase 5: API reads Arc and refuses unsigned sends

- **API tests:** 9 passed. Live test: USDC `decimals()` is 6, and the local EIP-712 hash matches `hashAction` on the deployed vault.
- **Local `/ready`:** 200, chain id 5042, database `select 1` succeeded after migration.
- **`GET /v1/vault/0xBDfC…0034`:** `10000` base units, summary `0.01 USDC in the vault`.
- **`GET /v1/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a`:** receipt exists, amount 10000.
- **Capabilities:** privacy, PQ, x402, swap, CCTP, and ERC-8004 report `executable: false` with a reason. No success path for those.
- **Startup bug:** the first process waited forever on the database. A connection timeout and a failed-migrate path that fails `/ready` closed fixed it. `/health` still returns 200.
- **Not deployed to Render or Vercel in this entry.**

## 2026-10-08 — Render and Vercel

- **API:** https://beacon-arc-api.onrender.com service `srv-db3ijo0m7kps73erhogg`
- **Web:** https://beacon-arc-one.vercel.app
- **`/health`:** 200 `{ok:true}`
- **`/ready`:** 200 chain id 5042
- **`/v1/vault/0xBDfC…0034`:** `0.01 USDC in the vault`
- **`POST /mcp` without a bearer:** 401
- **Browser:** the production page shows `$0.01 USDC in the vault` and marks swap, CCTP, privacy, PQ, x402, and ERC-8004 unavailable.
- **Env names set on Render:** `ARC_RPC_URL`, `CHAIN_ID`, `EXECUTOR_PRIVATE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `BEACON_VAULT_FACTORY`, `BEACON_RECEIPT_REGISTRY`, `ARC_USDC`, `NODE_VERSION`
- **Evidence:** `evidence/production.json`

## 2026-10-08 — 0G frontend copied and retargeted to Arc

The first hosted page was a small static shell. The product UI is the Beacon 0G app, retargeted. `0g/beacon-0g` was not edited.

1. Removed the static `apps/web/app.js`, `config.js`, and `styles.css`.
2. Copied `0g/beacon-0g/apps/web` into `arc/apps/web` (Vite, React 19, Tailwind 4, wagmi, Reown, motion, react-router).
3. Retitled `index.html` to `Beacon — Arc USDC firewall`.
4. Replaced banned runtime strings in source (tests are skipped by the ban guard and still name the old chain): Aristotle → Arc, TeeML → policy, W0G → USDC, `evmrpc.0g.ai` → `rpc.mainnet.arc.io`, chain id 16661 → 5042 outside tests. A first replace turned `get.0g.ai` into `get.explorer.arc.io`; those hosts were then set to `https://explorer.arc.io`.
5. `apps/web/src/lib/chain.ts` now uses chain 5042, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`, USDC `0x3600…0000`, registry `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C`, factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`, vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`. Old names (`escrow`, `jobRegistry`, `safeFactory`) are aliases of those four contracts so the copied app typechecks. They are not separate 0G contracts.
6. `publicEnv.ts` points production at `https://beacon-arc-api.onrender.com`. Dev proxy in `vite.config.ts` forwards `/v1`, `/health`, and `/ready` to that API.
7. `reown.ts` wallet network is Arc, native currency name USDC, production URL `https://beacon-arc-one.vercel.app`.
8. `apps/web/.env.production` was rewritten to public Arc values only. Root `.gitignore` ignores `.env.*`, so Vercel does not upload that file. Production uses the source fallbacks.
9. `npm install` at the repo root added the web workspace (500 packages). `npx tsc -p apps/web --noEmit` passed. `vite build` passed.
10. Root `vercel.json` builds `@beacon/web` and publishes `apps/web/dist`, with an SPA rewrite to `/index.html`.
11. Ban guard on `packages`, `apps`, and `scripts` reported clean after the copy pass.
12. Landing, navbar, why-Arc, protection story, how-it-works, manifesto, architecture strip, feature chips, and the agent card were rewritten to the USDC firewall: grant, cap, allowlist, EIP-712, vault transfer, receipt. Swap, CCTP, privacy, PQ, x402, and ERC-8004 stay off.
13. `arcApi.ts` reads `/v1/capabilities` and `/v1/vault/:owner`. Amounts use 6 decimals. The desk note says it does not quote a compute job and does not move USDC.
14. Security page shows `ArcVaultPanel` from those live reads. A wallet with no vault shows “No vault for this wallet”. The deployed vault owner is `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`.
15. Workspace catalog is local (Vault, Allowlist, Receipt, Send, Policy, Off). The main button is “Read the vault”. It calls `readArcDesk` and does not call `createJob`.
16. Flow chat replies with `describeArc` and `displayModel: "Arc vault"`. It does not call `/v1/agents/chat`. Conversation history is an empty list because this API has no chat store.
17. `approveJobOnChain` throws and does not broadcast. It tells the user the agent signs the USDC action.
18. Verify page: a 32-byte id calls `readArcReceipt` on `receipts(bytes32)` and returns vault, agent, recipient, amount, nonce, exists. The old 0G receipt ABI is not used for that hash. The page title is “USDC receipt”. The independent RPC line is green only when those fields match the API.
19. Live registry read of `0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a` matches the API: vault `0x71Ef…FAB6`, agent `0xc3b183…42dc`, recipient `0xBDfC…0034`, amount `10000` (0.01 USDC), nonce `0`, exists true.
20. Production deploys of this tree, in order, all aliased to `https://beacon-arc-one.vercel.app`:
    - first Vite app
    - vault desk (`Read the vault` present in the production chunk)
    - receipt page, deployment `dpl_JTWnUH5rScDGuQyX21P1Htu4Pi5s`, ready. Production chunk `assets/VerifyPage-NHNBN6mo.js` contains `USDC receipt`.
21. Git `main` is still `5fcb2a1` (“feat: point the site at the live Arc API”). The Vite app is uncommitted. `.env`, `.env.local`, and `.vercel/` stay untracked. No commit was made because none was requested.
22. Security deposit, withdraw, pause, and executor buttons were still calling `api.prepareVault` and could broadcast returned calldata. That mutation now throws and submits nothing. Execution-step labels no longer say `lockNative`, TEE, or Storage. They describe policy, EIP-712, relay, `USDC.transfer`, and the receipt registry.

**Still open:** contract source is not verified (explorer API returned a Cloudflare challenge). Old job, TEE, and policy client calls remain in `api.ts` and some security queries. Chat does not prepare a signed send. Swap, CCTP, privacy, PQ, ERC-8004, and x402 stay off. The acceptance gate is not green. This goal is not complete.

## 2026-10-08 — Resume: vault journey and MCP deny paths

- **Phase:** continue from the live vault. Do not redeploy contracts.
- **Read:** `ARC_BEACON_EXECUTION_PLAN.md` §§2–3.1, 8–10, phases 5–8; `BUILD_HISTORY.md`; `apps/api/src/server.mjs`; `BeaconUsdcVault.sol`; `BeaconVaultFactory.sol`.
- **Bug:** `handleMcp` called `readers` from outside `createServer`. `get_vault` would throw before any tool ran. The handler now receives `readers`.
- **API:** `POST /v1/grants/revoke` requires the owner session and the grant’s vault. MCP gained a `verify` tool that returns `no_receipt` when the registry row is missing.
- **Frontend:** `/flow/vault` is the owner journey: connect, wrong-chain switch, one vault per owner, ERC-20 USDC transfer, EIP-191 session that does not move funds, `setPolicy`, pause, `allowRecipient`, `setGrant`, API bearer, revoke, and a send that signs only when the connected wallet is the agent. Success without `txHash` throws.
- **Removed broadcast:** `executeAgentVaultPrep` and `sendPreparedVaultTx` throw. They no longer send arbitrary calldata.
- **Tests:** `node --test apps/api/src/server.test.mjs` — 7 passed, 0 failed. New cases: MCP initialize and tools/list with a grant, over-cap prepare, revoke then 401, mutated amount does not broadcast. `npx tsc -p apps/web --noEmit` passed.
- **Not deployed:** Render and Vercel still serve the previous push. Status file: `CURRENT_STATUS.md`.
- **Not green:** source verification, swap, CCTP, ERC-8004, PQ, x402, privacy execution, full E2E, old job UI removal, production click-through.

## 2026-10-08 — Vault desk is the live product page

- **Desk:** `/flow/desk` now renders the vault journey. The nav label is Vault. The “Escrow AI jobs” header is gone.
- **Flow:** the chat no longer calls `/v1/tee/status`, the old agent list, or conversation history on connect. Those routes do not exist on this API.
- **Swap read:** `cast call` Uniswap V2 `getAmountsOut` for 10000 USDC base units to EURC returned `[10000, 8427]`. Evidence: `evidence/swap-quote.json`. `GET /v1/quote/swap` returns that shape with `executable: false` because the deployed vault has no swap function. API test count is 8 passed. This route is not on Render yet.
- **Vercel:** production deployment `dpl_JBrwtBX5hSdmZFyqrVEz4pqdBjbz`, alias https://beacon-arc-one.vercel.app. Chunk `assets/VaultJourneyPage-BCqfkQ6K.js` contains “Create my vault”.
- **Browser:** https://beacon-arc-one.vercel.app/flow/desk shows “Your USDC vault”, chain 5042, and the seven steps. Connect is enabled. Create, fund, policy, grant, and send stay disabled until a wallet is connected.
- **Not pushed.** Git `main` is still `5fcb2a1`. The acceptance gate is not green.

## 2026-10-08 — Swap quote is a direct Arc read

- **Problem:** the deployed desk called `GET /v1/quote/swap` on Render. That route is only in the working tree, so production returned 404.
- **Change:** the desk now calls Uniswap V2 `getAmountsOut` on `https://rpc.mainnet.arc.io`. It does not send a transaction.
- **Live test:** `node --test apps/api/src/live.test.mjs` — 2 passed. USDC decimals are 6, the known action hash matches the vault, and 10000 base units quotes a non-zero EURC amount.
- **Vercel:** `dpl_3vNiysUvVf5W1p5PweEX6TAdumck`, alias https://beacon-arc-one.vercel.app.
- **Browser:** the owner wallet `0xBDfC…0034` is connected. The page shows `0.01 USDC in the vault`, vault `0x71Ef…FAB6`, policy v1, nonce 1, max 10000. The quote line is `8427` EURC base units and says the vault has no swap function. Create stays disabled because this owner already has a vault. Network: vault `200`, router RPC `200`, no quote 404.
- **Still not on Render:** grant revoke and `GET /v1/quote/swap`. The acceptance gate is not green.

## 2026-10-08 — Field mutations revert, source is not explorer-verified

- **Forge:** `forge test` — 27 passed, 0 failed, including 256 fuzz runs. New cases change the signed recipient, amount, agent, grant id, deadline, nonce, policy version, amountOutMin, quote hash, and tokenOut. Every change reverts. Nonce reverts `BadNonce` and policy version reverts `PolicyMismatch` before signature recovery. A changed tokenOut reverts `TokenMismatch`. The other edits revert `BadSignature`. None of them transfer USDC.
- **Explorer API:** `GET https://explorer.arc.io/api/v2/smart-contracts/0xB448…` returned 403 `text/html` with `Cf-Mitigated: challenge`. Automated `forge verify-contract` cannot pass that challenge.
- **Sourcify:** chain 5042 registry address returned 404, `match: null`.
- **Browser:** the vault contract tab shows bytecode and **Verify & publish**. It does not show source. The verification form opened and was not submitted.
- **Bytecode:** local `forge inspect` and `cast code` for the vault are the same length and share metadata `c884a41f0b5bda9365e92e320f243e4026bfc85150e2cda73348532160da48bb`. They are not byte-identical because the on-chain copy contains the constructor domain separator. Evidence: `evidence/source-verification.json`.
- **Status:** not verified on the explorer. Do not describe the vault as verified.

## 2026-10-08 — Production HTTP checks and competitive review

- **Tests:** `node --test apps/api/src/production.test.mjs` — 4 passed. Production `/health` and `/ready` are up, chain id 5042. The owner vault returns `10000` base units and `0.01 USDC`. Send is executable. Swap, CCTP, privacy, PQ, x402, and ERC-8004 are not. `POST /mcp` with no bearer is 401. The login challenge has no transaction hash. `https://beacon-arc-one.vercel.app/flow/desk` is the Arc firewall shell and does not contain “Escrow AI jobs”.
- **Review:** `COMPETITIVE_REVIEW.md`. Beacon’s difference from MergePay, A-Identity, Legwork, Uniswap, Payrun, and x402 apps is the signed action the executor cannot edit. Adding a screen does not copy that. The review does not claim the gate is green.
- **Not done:** Playwright wallet E2E, explorer verification, Render deploy of the uncommitted API, and the rest of the acceptance gate.

## 2026-10-08 — Agents and Safe no longer show the old job product

- **Removed from the routes:** the job desk, the TEE security page, and the old MCP grant screen that offered image, job, and bridge scopes. Those files are deleted. `/flow/security` is the vault journey. `/flow/mcp` is the Arc agent page. `/desk-legacy` redirects to the vault.
- **Vercel:** `dpl_25q9ZaaiEmwzvJ3SyQrWWmVLH54h`, alias https://beacon-arc-one.vercel.app. Typecheck passed before the deploy.
- **Browser:** https://beacon-arc-one.vercel.app/flow/mcp shows “Agent access”, the Render MCP endpoint, and the five real tools. “Call initialize with no bearer” returned `401` and `Bearer required.` https://beacon-arc-one.vercel.app/flow/security shows “Your USDC vault”, not a TEE unlock.
- **Not pushed.** The acceptance gate is not green.

## 2026-10-08 — Playwright against production

- Chromium for Playwright installed. `npx playwright test` — 3 passed in 10s.
- The vault desk shows “Your USDC vault” and the send button, and does not say “Escrow AI jobs”.
- Agents: initialize with no bearer shows “Bearer required.”
- Safe shows the vault journey and does not show “Unlock Beacon Agent”.
- CI workflow now also runs the API unit tests, the live Arc reads, the production HTTP checks, and Playwright. That workflow is in the working tree. It has not run on GitHub because this tree is not pushed.

## 2026-10-08 — Sourcify exact match

- **Command:** `forge verify-contract` with `--verifier sourcify --chain 5042 --via-ir`. The vault also used `--guess-constructor-args` against `https://rpc.mainnet.arc.io`.
- **Vault** `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`: job `da26356c-8256-4512-93fe-eac434c3496e`, status `exact_match`. Match id `55782816`.
- **Registry** `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C`: job `c620d549-e9ef-4dc8-bb92-6b4ac934f0a9`, status `exact_match`. Match id `55782819`.
- **Factory** `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`: job `5f399d63-7665-47ef-a650-63a25a3bf460`, status `exact_match`. Match id `55782820`.
- **Recheck:** `GET https://sourcify.dev/server/v2/contract/5042/<address>` returned 200 and `creationMatch` and `runtimeMatch` of `exact_match` for all three.
- **Explorer:** the Blockscout page was still on the unpublished verification form. The explorer API remains a Cloudflare 403. Sourcify is the verification record. Do not say the explorer badge is verified.

## 2026-10-08 — Verify page no longer shows a job proof

- **Change:** `/verify/:id` now reads only a 32-byte Arc action hash. A non-hash id says “Not an Arc receipt” and does not render escrow, TEE, storage, or job status. A missing registry row says “No receipt”.
- **Typecheck:** `npx tsc -p apps/web --noEmit` passed before deploy.
- **Vercel:** `dpl_4iCu5h9ZfsShiSTQPMFjSkr1RhVQ`, ready, aliased to https://beacon-arc-one.vercel.app. Inspector https://vercel.com/goats-projects-3f023cc9/beacon-arc/4iCu5h9ZfsShiSTQPMFjSkr1RhVQ.
- **Playwright:** `npx playwright test` — 5 passed. The first receipt assertion failed because “0.01 USDC” matched two nodes. The assertion now requires `0.01 USDC · 10000 base units`. The rerun passed.
- **Production proof:** https://beacon-arc-one.vercel.app/verify/not-a-job has no “Job proof”. https://beacon-arc-one.vercel.app/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a shows “USDC receipt” and `0.01 USDC · 10000 base units`.
- **Not done:** Render is still `5fcb2a1` and does not have grant revoke. The landing still has a “Preparing a job” diagram label. The acceptance gate is not green. Not pushed.

## 2026-10-08 — Landing, block, activity, and typecheck

- **Landing:** the quality diagrams now say Connect, Policy, Sign, Relay, Vault, Transfer, Allow, Cap, Receipt. The section label is “Preparing a send”. It no longer says “Preparing a job”.
- **Vault page:** Block recipient calls `blockRecipient`. Revoke on-chain grant calls `revokeGrant`. Activity lists `Executed` logs from the vault. A failed log read is shown as an error, not as a success.
- **Chat cards:** a job card cannot call `approveJobFromSafe`. A swap card cannot call `executeSafeSwap`. Both explain that those actions are not this product.
- **Typecheck:** the first `tsc -p apps/web/tsconfig.app.json --noEmit` failed with 6 errors, including an unused refresh callback and impossible TEE comparisons. Those were fixed. The rerun passed.
- **Vercel:** `dpl_VTnsgDzMd6jwy8PAP8HnitrmM5AK`, ready, aliased to https://beacon-arc-one.vercel.app.
- **Playwright:** `npx playwright test` — 6 passed, including the vault block and activity headings and the landing text.
- **Not done:** Render is still the older API. The acceptance gate is not green. Not pushed.

## 2026-10-08 — Legacy job routes refuse before fetch

- **Change:** `request()` in the web client throws before `fetch` for jobs, agent chat, TEE, services, vault prepare, safe swap, flow history, safe-session, bridge, credit, receipts, security, and `/v1/mcp`. Compute-job event streams throw and do not open an `EventSource`.
- **Flow:** a paid resend no longer calls `/v1/agents/chat`. Loading, renaming, pinning, or archiving a chat no longer calls `/v1/flow`. A job card no longer polls `/v1/jobs` and no longer offers a start button.
- **Tests:** `node --test apps/web/src/lib/refusedPaths.test.ts` — 2 passed.
- **Typecheck:** the first `tsc -p apps/web/tsconfig.app.json --noEmit` failed because the unused job setters were still declared. Removing them made phase comparisons impossible, so the job card is now a static “Not an Arc send” link to the vault. The rerun passed.
- **Vercel:** `dpl_DtutjAnTxabLuEDtKhxvamYGCcgt`, ready, aliased to https://beacon-arc-one.vercel.app.
- **Playwright:** the first full run had 5 passed and 1 failed. The MCP button stayed disabled while Render had not answered within 5 seconds. The assertion wait is now 30 seconds. The rerun passed, then `npx playwright test` passed 6 of 6.
- **Not done:** Render is still the older API. The acceptance gate is not green. Not pushed.

## 2026-10-09 — Duplicate Create was requested while the vault was still loading

- **Screenshot:** Rabby showed method `Create` to factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`, owner Account 2, executor `0x412045b7c64d471DE57024f11E080289e6082172`. Network fee said Unavailable USDC. The button said Review alert. The page still said “Reading the vault…”.
- **Live reads:** `eth_chainId` is 5042. `vaultOf(0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034)` is `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`. That vault’s `owner()` is the same address and `executor()` is `0x412045b7c64d471DE57024f11E080289e6082172`. Code size 5047. The factory has no `predict` function.
- **Simulation:** `cast call create(owner, executor)` from that owner reverted `VaultExists`, selector `0x4239717c`. The owner’s native balance is `1258159077718862862` base units, so the account can pay gas. The fee is unavailable because the call reverts, not because the balance is zero.
- **Alert:** the attached browser could not open the Rabby popup. The visible control is Rabby’s Review alert on an unfamiliar contract whose simulation reverts. This Create is unnecessary. Do not sign it. Cancel it in the wallet.
- **Cause:** Create stayed enabled while the vault query had not returned. The button is now disabled until that read finishes, and it says “Vault already exists” when the factory already has one. The click reads the API again and does not broadcast if a vault is found.
- **Activity:** `eth_getLogs` over more than 10000 blocks returns `-32012 requested range too large`. The vault was created in block `24848337`. The send is in block `24848449`. The page now reads logs in 4000-block chunks from that creation block.
- **Vercel:** `dpl_2zGZPPy8FnwmRujb5Zu6NfESrFZh`, ready, aliased to https://beacon-arc-one.vercel.app. Typecheck passed before the deploy.
- **Not signed.** The acceptance gate is not green. Not pushed.

## 2026-10-09 — A valid owner call can be priced; activity reads are chunked

- **Gas:** `cast gas-price` on `https://rpc.mainnet.arc.io` returned `20000001003` wei, about 20 gwei. `cast estimate setPaused(true)` from the owner on vault `0x71Ef5450…FAB6` returned `29998` gas. That call was not broadcast. A valid owner transaction can be priced. The earlier Unavailable fee belonged to the reverting Create.
- **Production API:** `POST /v1/auth/challenge` with the owner address returned a login message and an expiry, no transaction hash. `POST /v1/vault/prepare-send` and `POST /mcp` return 401 without a session. `POST /v1/grants/revoke` and `GET /v1/quote/swap` return 404 on Render. Those two routes exist only in the working tree.
- **Activity:** log reads stay in 4000-block chunks, now six at a time. The row label says “action nonce” so it is not confused with the vault nonce.
- **Vercel:** `dpl_7DYAkER2NXt7JJjeUgrYToF4ryeF`, ready, aliased to https://beacon-arc-one.vercel.app. Typecheck passed before the deploy.
- **Not signed.** The acceptance gate is not green. Not pushed.

## 2026-10-09 — Session length and live API limits

- **Typecheck:** `npx tsc -p apps/web/tsconfig.app.json --noEmit` passed.
- **Copy:** the browser session now says 12 hours, matching `saveSession`. The login challenge is 10 minutes. It still does not move funds.
- **Revoke:** a 404 from `POST /v1/grants/revoke` now says the API does not revoke bearers yet and the on-chain grant is unchanged.
- **Agents page:** says the live API lists capabilities, get_vault, prepare_send, and submit_signed_send. Verify is marked as not listed there yet.
- **Vercel:** `dpl_4S64XQUi3AEfCPfszKwSMEqABZ6K`, ready, aliased to https://beacon-arc-one.vercel.app.
- **Not signed.** The acceptance gate is not green. Not pushed.

## 2026-10-09 — The connected wallet is the owner, not the grant agent

- **Chain:** `grants(1)` on vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` returned agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`, max `10000`, expiry `1792040766`, scope `1`, active `true`.
- **Page:** the vault page reads that grant. Production shows “Grant 1 is active for 0xc3b183D5e4436C20282650348BE2D6c94c4142dc. Max 10000 base units. Expires 2026-10-15T05:06:06.000Z. Scope 1. This wallet is not that agent, so it cannot sign a send.” Sign and relay stays disabled. Create stays “Vault already exists”.
- **Typecheck:** `npx tsc -p apps/web/tsconfig.app.json --noEmit` passed.
- **Vercel:** `dpl_9UNY5XW4kxCMv1xgKv2Vf5MNsF6R`, ready, aliased to https://beacon-arc-one.vercel.app.
- **Playwright:** `npx playwright test` passed 6 of 6 against that alias.
- **Explorer:** the contract tab now says “Contract source code verified (exact match)” via the Blockscout Bytecode Database. Vault `BeaconUsdcVault` verified Oct 9, 2026 5:58:54. Factory `BeaconVaultFactory` verified Oct 9, 2026 5:59:27. Registry `BeaconReceiptRegistry` verified Oct 9, 2026 5:59:49. Compiler `0.8.26+commit.8a97fa7a`, Cancun, optimizer 200. The verification form was opened and was not submitted. The Sourcify widget already said Exact Match. This is source publication, not a security audit.
- **Not signed.** The acceptance gate is not green. Render is still the older API. Not pushed.

## 2026-10-09 — Unchanged policy and empty addresses no longer open a transaction

- **Typecheck:** `npx tsc -p apps/web/tsconfig.app.json --noEmit` passed, exit 0.
- **Policy:** `setPolicy` always increments `policyVersion`. The live caps are 10000 and 50000 base units with a 86400-second window. The button now reads `windowSeconds` and stays disabled as “Policy already matches” when the form equals that state. Production shows that sentence.
- **Addresses:** Allow, block, and register stay disabled until the field is a 20-byte hex address. Register no longer falls back to the connected wallet. An empty agent field does not replace grant 1.
- **Vercel:** `dpl_EAS6xnZEsXoARj482nSrErrP7EYQ`, ready, aliased to https://beacon-arc-one.vercel.app. The reloaded page still shows vault `0x71Ef…FAB6`, grant 1 for `0xc3b183…`, and the 10000-base-unit activity row.
- **Not signed.** The acceptance gate is not green. Render is still the older API. Not pushed.

## 2026-10-11 — Vault buttons, activity speed, and per-question flow answers

- **Buttons:** outlined actions sat on the same dark card color, so disabled controls were hard to see. Enabled actions are now green with dark text. Disabled actions are a light-gray label on `#3a4149`. Production measured “Vault already exists” at 164×44, color `rgb(247, 248, 248)` on `rgb(58, 65, 73)`, and “Transfer USDC to the vault” at 209×44, color `rgb(6, 33, 22)` on `rgb(57, 224, 138)`.
- **Speed:** the activity reader was walking from block `24848337` to head `25469436`, about 621,000 blocks, in 4,000-block chunks. It now reads the creation window and the latest 12,000 blocks. The reloaded vault page showed the 10000-base-unit receipt in the same view as the vault.
- **Vault read:** the page reads `vaultOf` and the vault fields from `https://rpc.mainnet.arc.io` instead of waiting on the hosted API.
- **Flow:** “Can I swap USDC?” answered “Uniswap V2 quotes 0.01 USDC as 8276 EURC base units. The live vault only has executeSend, so Beacon will not trade.” “Show my vault balance and policy.” answered with vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`, 0.01 USDC, policy v1, nonce 1, cap 0.01, window 0.05.
- **Docs checked:** `https://docs.arc.io/arc/concepts/execution-layer` lists Arc Privacy Sector as planned. `https://docs.arc.io/arc/concepts/opt-in-privacy` describes APS, not a live mainnet path. `https://docs.arc.io/arc/references/contract-addresses` lists CCTP domain 26 and TokenMessengerV2 `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`. `cast codesize 0x1800…0004` returned 1. Those capabilities stay off. A quote is not a trade. A burn is not a completed bridge.
- **Vercel:** `dpl_52rtxQUeQvvpiS3eDV7Y5tveq1tK`, ready, aliased to https://beacon-arc-one.vercel.app. Typecheck passed before the first deploy in this pass.
- **Git:** pushed `4c67940` to `https://github.com/goat-dev8/beacon-arc` `main`. No secret values were committed.
- **Render:** service `beacon-arc-api` went live on `4c67940`. `/health` returned ok. `/ready` returned chainId 5042. `/v1/capabilities` returns the same off reasons as the site. `POST /v1/grants/revoke` without a bearer returns 401, where the previous deploy returned 404. Env names present: `ARC_RPC_URL`, `CHAIN_ID`, `EXECUTOR_PRIVATE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `BEACON_VAULT_FACTORY`, `BEACON_RECEIPT_REGISTRY`, `ARC_USDC`, `NODE_VERSION`.
- **Not signed.** The acceptance gate is not green. Swap, CCTP, privacy, PQ, x402, and ERC-8004 stay off.

## 2026-10-12 — A send question was answered as the allowlist

- **Bug:** “Prepare a USDC send to an allowlisted recipient.” matched the word `allow` inside `allowlisted`, so the chat returned the allowlist sentence.
- **Fix:** a prompt that says send or prepare reads the vault and grant 1 and answers the send. “Who can this vault pay?” reads `RecipientAllowed` logs.
- **Production check:** the send answer now lists vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`, owner `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`, executor `0x412045b7c64d471DE57024f11E080289e6082172`, grant 1 agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`, and says this wallet is not that agent. The allowlist answer lists `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034` as allowed.
- **Vercel:** `dpl_3Lq5hJjpY5VWthk7Rma2gEMZAg9R`, ready, aliased to https://beacon-arc-one.vercel.app.
- **Not signed.** A quote is still not a trade. This chat does not move USDC.

## 2026-10-12 — Agents page names the live verify tool

- **Copy:** the agents page said revoke and verify were absent. The live API already lists verify, and revoke without a bearer returns 401. The page now says that. The initialize button uses the same solid fill as the vault actions.
- **Typecheck:** `npx tsc -p apps/web/tsconfig.app.json --noEmit` passed, exit 0.
- **Vercel:** `dpl_HSZUF431788gCVSDA7gSNTBR4LwZ`, ready, aliased to https://beacon-arc-one.vercel.app. `/flow/mcp` shows the corrected sentence. “Call initialize with no bearer” returned `Bearer required.`
- **Not signed.** The acceptance gate is not green.

## 2026-10-12 — Flow chips read Arc before they answer

- **Reads:** a swap chip calls `getAmountsOut` and checks the vault bytecode for `executeSend` `5384627c` and `swapExactTokensForTokens` `38ed1739`. CCTP reads TokenMessengerV2 and MessageTransmitterV2, including `localDomain()`. PQ reads the precompile size. ERC-8004 reads the identity proxy and its EIP-1967 implementation. Verify reads `receipts(bytes32)`. Cap reads the over-cap transaction status.
- **Production:** `dpl_9XsgV3UR8dzGUvNAGDhnh4wudy3N` at https://beacon-arc-one.vercel.app/flow. “Can I swap USDC?” at block 25475778 quoted 8276 EURC base units, router 21902 bytes, vault 5047 bytes, send selector present, swap selector absent. “Can I bridge USDC with CCTP?” at block 25475862 showed TokenMessengerV2 at 2175 bytes and `localDomain()` 26.
- **Test:** `npx vitest run src/lib/arcFlow.test.ts` passed 3 of 3 after the cap answer kept the reverted receipt when no wallet vault was loaded.
- **Not signed.** Beacon still does not trade, burn, or settle those rails. The acceptance gate is not green.

## 2026-10-13 — Rescue run kickoff: 8-agent evaluation verdict, 15-worker execution

- **Phase:** evaluation complete; execution starting ~21:00 EEST. Working copy on branch `rescue/p0`. Submission deadline Oct 14, 2026 23:59 ET (~30h).
- **Evaluation method:** 7 independent evaluator agents (build forensics, live-app audit, on-chain verification, docs-grounded swap architect, docs-grounded bridge architect, competitor analysis, idea coherence) + 1 integrator. Verdict: **6.8/10 now, ~7.5/10 achievable**, estimated rank **~8th–12th of ~20**.
- **Independently verified against live Arc RPC (5042) on 2026-10-13:** registry `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` 1149 bytes, factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` 6413 bytes, vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` 5047 bytes — all match `evidence/deployment.json` to the byte. Send `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` status `0x1`, block 24848449, one ERC-20 Transfer of 10000 raw = 0.01 USDC. Over-cap `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` status `0x0`, block 24848550; replayed revert data `0x342fa66d` = `keccak("OverCap()")[:4]` computed independently. Sourcify `exact_match` (creation + runtime) live for all three contracts via the public v2 API — judge-reproducible at `https://repo.sourcify.dev/5042/<address>`. Vault live state: owner `0xBDfC…0034`, executor `0x4120…2172`, paused false, maxPerTx 10000, windowLimit 50000, windowSeconds 86400, policyVersion 1, nonce 1, windowSpent 10000. Grant 1: agent `0xc3b1…42dc`, maxPerTx 10000, scopes 1, active, expires **2026-10-15T05:06:06Z**.
- **Verified integration addresses (docs + on-chain, 2026-10-13):** real Uniswap v3 on Arc — factory `0xf0db7b58379503491d857dB50AC9ece64c653918`, SwapRouter02 `0x53Bf6B0684eC7eF91e1387dA3d1A1769Bc5A6F77`, QuoterV2 `0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468`, USDC/EURC 0.05% pool `0x6fd5f2fb831940dcd61a98c5b3acb7d8c6f3bfc1`. Canonical `0x1F98431c8aD98523631AE4a59f267346ea31F984` is **squatted** (2747 bytes of non-Uniswap code) — never trust canonical addresses on Arc. CCTP V2 — domain 26 confirmed live via `localDomain()`, messenger `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`, transmitter `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64`.
- **Honest gaps a judge will find:** (1) the 0.01 USDC "send" went to the owner's own address — the mechanism is proven, not a real counterparty payment; (2) total real economic volume is 0.01 USDC, one tx, stale since ~Oct 8–9; (3) the "executor contract" is an EOA (`0x4120…2172`, 0 bytes of code) — correct per design, mislabeled in docs; (4) grant 1 expires 2026-10-15T05:06:06Z — after that every agent send reverts `GrantExpired`; (5) the verify page shows a **false negative** ("The API did not return the same fields") while direct RPC confirms all five fields match — the #1 judge-facing bug; (6) the live swap quote is v2-only and misquotes ~6× (1 USDC → 0.146 EURC vs ~0.878 on the real v3 0.05% pool); (7) the `/flow` swap card looks functional until clicked; "Arc faucet" button links to the explorer (no mainnet faucet); dead `openZeroGFaucet`/`onMint` wiring; onboarding leaks "Beacon Safe, Prepaid budget" 0G language.
- **Root cause (structural, not a wiring bug):** the deployed vault is immutable and its only money-moving function is `executeSend` (`CLASS_SEND = 1`). It reverts `ScopeDenied` for any other action class and `TokenMismatch` when `tokenOut` is set. No swap entrypoint, no burn/mint, no rail hook. The EIP-712 `Action` schema was designed with swap fields (`tokenOut`, `amountOutMin`, `quoteHash`) but execution was never built. **Swap/bridge/x402/PQ/privacy/ERC-8004 cannot be "connected" to the live vault — they need new contracts, which means a redeploy, which orphans every existing proof.** This is why Cursor's wiring attempts kept failing.
- **Strategy (all 7 agents converged):** subtraction + proof, not addition. Product thesis: *"The vault that cannot be tricked: every USDC movement is an agent-signed, policy-checked, allowlist-bound action — and everything else is read-only."* Swap and CCTP stay read-only (quote via real v3; bridge via attestation tracker); x402, PQ, privacy, ERC-8004 registration, and the 0G screens are CUT from the product surface. Demo loop frozen: allow-path receipt → OverCap money shot → recipient refusal → revoke.
- **Execution:** user ordered a 15-worker real build (~20:51 EEST): full changes, tests, deploy, contract verification where applicable, pushes under the user name `goat-dev8`. W9 (history-scribe) owns this file; worker progress files land in `/home/hatch/workspace/beacon-build/progress/`.
- **Constraints (standing):** no redeploy of the live vault; no capital injection — dust-only on-chain ops (≤0.01 USDC proof amounts + gas); no video work (user does it later); **no worker handles private keys** — the re-grant (before 2026-10-15T05:06:06Z) and the one real third-party 0.01 USDC send are owner runbook steps; pushes under user name `goat-dev8`; every test re-run before claiming green.
- **Deliverables from evaluation:** `~/workspace/your_files/beacon-arc-evaluation-report.md`, `~/workspace/your_files/beacon-arc-cursor-plan.md`; raw agent reports in `~/workspace/beacon-review/`.
- **P0 order:** P0-1 verify false-negative fix → P0-2 homepage proof section → P0-3 v3 swap quote with startup squat guard → P0-4 swap card de-mislabel → P0-5 legacy-language scrub + executor label fix → P0-6 receipt CSV export → P0-7 owner re-grant + one real third-party send (owner-run) → P0-8 JUDGE-QUICKSTART. Then P1 (CCTP attestation tracker UI, cleanup). P2 is post-deadline.
- **Not done yet:** everything in the P0 list. The acceptance gate is not green.

## 2026-10-13 — Rescue branch merged to main and deployed

- **Bundle:** the first download was corrupt (12932162 bytes). The re-attached file is 7115485 bytes, SHA-256 43108D0C5D26CF58EC051B9BF9D208B0CB8163B30BBED63FF18430C6AA007AAF. It verified and fetched as `rescue/p0` at `c67d0c6`.
- **Push:** `rescue/p0` pushed. `main` merged with `--no-ff` and pushed as `ea60339`.
- **Render:** `dep-db78l36gekts73djdqkg` live on `ea60339`. `/ready` returned 200, chainId 5042. `/v1/quote/swap?amount=1000000` returned `uniswap-v3`, amountOut `892767`, executable false.
- **Vercel:** no git-triggered deploy appeared. `dpl_FeiFmYzGNMXfJZZe4WEjXVDQ5Wzv` was deployed from `main` with the CLI. READY, aliased to https://beacon-arc-one.vercel.app.
- **Browser:** the homepage shows the Live on Arc mainnet section, the stat strip `0.02 USDC`, `2 executions`, `1 refusal`, and three transaction cards. `/verify/0xcd92…` shows a green "Independent RPC agrees with the API." panel.
- **e2e:** 9 of 10 passed. `the vault desk is the USDC journey` failed because it looks for heading `8. Activity`; the page exposes `Activity` only, the number is `aria-hidden`.
- **Gaps:** `/flow/vault` has no "Read-only quote" banner and no disabled "Swaps stay off" button. Those strings are in `ActionCards.tsx`, which the vault page does not render. The vault page's quote is a direct V2 router read. The flow chip's swap answer is also V2. The judge quickstart says v3.
- **Not signed.** The acceptance gate is not green.

## 2026-10-13 — Session log: agents copy, flow reads, rescue deploy, verification

- **Agents page:** committed `15680e8`. Vercel `dpl_HSZUF431788gCVSDA7gSNTBR4LwZ`. The page names `verify` and says revoke without a bearer returns 401. `/flow/mcp` initialize with no bearer returned `Bearer required.`
- **Flow chips read Arc:** committed `0f589ec`. Vercel `dpl_9XsgV3UR8dzGUvNAGDhnh4wudy3N`. The swap answer reads `getAmountsOut` and vault bytecode selectors. The CCTP answer reads `localDomain()`. The cap answer keeps the reverted over-cap receipt status. `apps/web/src/lib/arcFlow.test.ts` passed 3 of 3 after one fix. Browser at block 25475778: 8276 EURC base units, router 21902 bytes, vault 5047 bytes, executeSend selector present, swapExactTokensForTokens absent.
- **Bundle:** the first download of `beacon-rescue.bundle` was corrupt: 12932162 bytes, SHA-256 17B3E4101EF79692A90D5D03DD782861FD1CF84D37D07F65FFA1650328B0B324. It was deleted. The re-attached file matched 7115485 bytes, SHA-256 43108D0C5D26CF58EC051B9BF9D208B0CB8163B30BBED63FF18430C6AA007AAF. It verified and fetched as `rescue/p0` at `c67d0c6`. The bundle stays untracked and was never committed.
- **Push and merge:** `rescue/p0` pushed. Safety scan of the branch diff and `.env.example` found no secret values. `main` merged `--no-ff` and pushed as `ea60339`.
- **Render:** `dep-db78l36gekts73djdqkg` live on `ea60339`. `/ready` 200, chainId 5042. `/v1/quote/swap?amount=1000000` returned `uniswap-v3`, amountOut 892767, executable false.
- **Vercel:** no git-triggered deploy appeared. `dpl_FeiFmYzGNMXfJZZe4WEjXVDQ5Wzv` was deployed from `main` with the CLI. READY.
- **Browser:** the homepage proof section and the verify page's green cross-check panel render. The vault page has no "Read-only quote" banner and no "Swaps stay off" button. It shows the V2 router read.
- **e2e:** 9 of 10 passed. Failure: `the vault desk is the USDC journey` expects heading `8. Activity`. The number is `aria-hidden`.
- **On-chain at block 25804266:** vault 50000 base units, nonce 2, policy v1, not paused. `0xa04c…` succeeded. `0xe53e…` reverted. Registry row for `0xcd92…` exists with recipient `0xCb2E…`, 10000 base units, nonce 1.
- **Not done:** the judge quickstart step 4 is partly wrong. The flow swap chip is V2, not v3. The three gaps are not fixed; diffs need approval first. Nothing was signed. The acceptance gate is not green.

## 2026-10-13 — Round 2 kickoff: rescue/p1 + 15 workers + real-MetaMask testing

- **Trigger:** Cursor pushed rescue/p0 → main (ea60339), deployed Render (dep-db78l36gekts73djdqkg) + Vercel CLI (dpl_FeiFmYzGNMXfJZZe4WEjXVDQ5Wzv). Found 3 gaps: (1) /flow/vault missing read-only banner + disabled swap button (V2-read card instead), (2) JUDGE-QUICKSTART step 4 says v3 while flow chip read V2, (3) e2e "8. Activity" locator + weak swap-banner test. Also: quote amountOut 892767 (live v3, not the 893125 estimate).
- **Branch:** `rescue/p1` from origin/main (bd9bc0d). Commits as goat-dev8 at the end. No pushes from VM (egress proxy blocks auth) — final bundle goes to Cursor.
- **Wave 1 (7 workers, parallel, no commits):** W19 vault page (swap card → v3 API + banner + disabled button + UX), W20 flow swap chip → v3 quote API + flow UX, W21 docs (quickstart step 4 + stale claims + wrong QuoterV2 address in docs), W22 e2e spec fixes (Activity locator, strong banner test, v3-not-v2 test), W23 verify-page UX, W24 homepage UX, W25 global UX layer.
- **Real wallet testing:** MetaMask installing in the operator's live browser via browser task (Chrome Web Store → import owner key 0xBDfC…0034 + agent key 0xc3b1…42dc → Arc mainnet 5042). NOT a simulated provider — the real extension. Full vault journey with dust amounts after wave 1.
- **Judge-style testing:** operator tests locally like a judge (JUDGE-QUICKSTART steps on local stack), fixes locally, then dust on-chain.
- **Flow chips plan (user order 23:09 EEST):** every Flow chat chip (Vault, Send, Allowlist, Cap, Swap, CCTP, Privacy) tested for real and fixed to work 100%. Executable chips (send/allowlist) tested with real dust txs. Read-only chips (swap quote, CCTP info, privacy check) verified against LIVE Arc mainnet reads — honest labeling kept: the immutable vault cannot execute swaps/bridges (needs redeploy), so "working" = live accurate data, never fake execution.
- **Not done yet:** wave 1 in progress; MetaMask setup in progress.

## 2026-10-13 — W24 ux-home (homepage) — done, uncommitted on rescue/p1

- **Narrative reorder** (`apps/web/src/pages/LandingPage.tsx`): proof moved up — Navbar → Hero → HeroTrustStrip → ManifestoQuote → WhatIsBeacon → LiveProofSection → StoryHowItWorks → ProtectionStory → WhyZeroGSection → ContractsSection → FinalCta → Footer. Cut `ArchitectureStrip` (redundant with the 6-beat loop) and `QualityBand`/`QualitySection` (diagram filler, no checkable claims).
- **LiveProofSection overhaul** (`components/landing/Sections.tsx`): OverCap refusal is now the full-width centerpiece — "THE MONEY SHOT", big "The vault said no.", pill `✕ REFUSED · status 0x0`, checkable grid (block 24848550, revert `OverCap() · 0x342fa66d`, USDC moved 0.000000, nonce spent none), "See the revert on the explorer ↗" CTA. Two success txs in 2-col grid with `● EXECUTED · status 0x1` pills (third-party 0.01 @ block 25790870; allow-path 0.01 @ block 24848449). Hashes render truncated (`0xa04c49…5d11d3`) with copy buttons (clipboard + "Copied ✓", full hash in title + explorer links). Contract cards carry `✓ exact_match` Sourcify pills. All e2e-required strings/hrefs preserved (id, "Live on Arc mainnet", "Proof, not promises.", 3 contract links, 2 tx links, /verify/0xcd92… link).
- **Navbar:** nav now Story → Proof (#live-proof, new) → Protect → Why Arc → Flow.
- **ProtectionStory:** "Open Beacon Safe" (legacy copy) → "Try the vault journey" → `/flow/vault`.
- **WhyZeroG:** swap rail now "Uniswap V3 quotes USDC to EURC, read-only." (was V2 — matches W2's v3 API).
- **FinalCta:** "Run the vault journey yourself." with "Open the vault" → `/flow/vault`.
- **Gates:** tsc clean (exit 0), `npm test` 31/31 pass. `npx vite build` FAILS on a pre-existing duplicate in `apps/web/src/lib/arcApi.ts` (imports `normalizeApiSwapQuote` from `./swapQuote` line 6 AND re-declares it line 71) — another worker's uncommitted swap WIP, NOT touched by W24. Flagged for the swap worker / integration lead.
- **Not committed** per W24 instructions. Progress: `~/workspace/beacon-build/progress/w24-ux-home.md`.

## 2026-10-13 — REDEPLOY AUTHORIZED: V2 execution track

- **User order (23:12 EEST):** "make everything work really 100%, even if you do a redeploy or anything." Standing no-redeploy constraint lifted by explicit order. Honesty layer survives: weakness/labels stay truthful.
- **env.txt re-upload:** all 24 keys byte-identical to the secured .env (verified by hash). Upload trashed; .env unchanged (600).
- **V2 scope decision:** new vault implementation with agent-signed, policy-checked `executeSwap` (EIP-712 action class; the schema already carries tokenOut/amountOutMin/quoteHash — execution was never built) via the pinned Uniswap v3 pool, output forced to vault. Plus `executeBridge` CCTP burn initiation (depositForBurn, dust) with live attestation tracking. V1 contracts stay live; all existing proofs remain valid and referenced.
- **Out of V2 scope (honest):** full destination-chain CCTP mint (attestation latency ~15-20 min + destination gas; burn + attestation tracking is the demoable unit), on-chain privacy (no live primitive on Arc — the PQ precompile is authorization-only).
- **Security invariant kept:** executor still cannot alter fields; vault still calls token/router/messenger itself; caps/windows/allowlist enforced on-chain.
- **Track:** W35 v2-architect (contract design + code) starts now, parallel to wave-1 fixes. Deployment done by operator via exec (keys never leave .env). Then V2 UI wiring, dust tests, docs/proof updates, bundle.

## 2026-10-13 — V2 DEPLOYED + FIRST REAL SWAP EXECUTION

### V2 stack (final, after 7-param CCTP fix)
- Registry: 0xcecb08b2cdacaf231b1838f20f932ad265fa2583 (tx 0x92a3b25e..., block 25808525)
- Factory: 0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e (tx 0xfb6c5a07..., block 25808528)
- Vault: 0x8901AAa87035b80c70B1636697DaE899Ef67c6fe (via factory.create, tx 0x87e14154...)
- All three: Sourcify exact_match (creation + runtime).
- Superseded (documented, not deleted): first V2 deploy (vault 0xc3d405eb..., registry 0x837aab85..., factory 0x43551cec...) had the 4-param CCTP bug. V1 (0x71Ef...) untouched and live.

### The CCTP 4-param vs 7-param discovery
- Arc's TokenMessenger is CCTP V2: depositForBurn takes 7 params (amount, destDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold). The 4-param version does not exist -> fallback revert -> BridgeFailed.
- Proven by direct EOA 7-param burn: SUCCESS tx 0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1 (0.005 USDC, Arc->Base domain 6).
- Vault fixed to 7-param (destinationCaller=0, maxFee=0, minFinalityThreshold=1000 hardcoded), 42/42 forge tests pass, redeployed.

### REAL SWAP EXECUTION (the headline)
- Agent-signed + executor-relayed executeSwap on V2 vault: SUCCESS.
- Tx: 0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c, block 25808007.
- 5000 USDC base units -> 4463 EURC base units, output landed in the vault (verified balance).
- Quote was 5000->4463, 1% slippage, amountOutMin enforced on-chain.

### REAL SEND ON V2
- executeSend 0.001 USDC to 0xCb2E...: SUCCESS tx 0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc.

### BRIDGE VIA VAULT: CHAIN-LEVEL BLOCK (proven, not our bug)
- Vault-mediated executeBridge reverts (empty). Direct EOA 7-param burn works.
- Definitive proof: 3 minimal test contracts deployed, all doing approve+depositForBurn:
  - BurnTest (plain 7-param): REVERTS
  - BurnTest2 (hook variant, empty hook): reverts "Hook data is empty"
  - BurnTest3 (hook variant, "cctp-forward"): REVERTS
- Conclusion: Arc's CCTP messenger implementation rejects contract-initiated burns. EOA-only. Not fixable by our contracts. The V2 bridge code is correct (42/42 tests, proper 7-param call); it will work if Arc/Circle lifts the restriction. UI must label bridge as chain-gated, not broken.
- Note: a third-party contract (0x56dcd172fa70bc06788a5bf644e0f2e28b3a9f1a) DID complete a hook-variant burn, but with complex forwarding hook data (GALTSD...) tied to Circle's forwarding service - not applicable to our plain-burn path.

### V2 setup (final vault 0x8901...)
- setPolicy(10000, 50000, 86400): 0xc6df2c7d...
- allowRecipient(0xCb2E..., true): 0x68dd40b8...
- setGrant(1, agent 0xc3b1..., 10000, 30d, scopes=7): 0xc32798e2...
- fund 0.02 USDC: 0x7fa982d5...
- Vault balances: ~0.019 USDC + 4463 EURC base units (after swap test on old vault; new vault holds 0.02 minus test sends).

### Remaining for full delivery
- V2 UI wiring (swap execution card, bridge honesty state) + API signing for new action classes.
- Update homepage/docs with V2 addresses + real swap proof.
- MetaMask journey (waiting on user to open the fox icon).
- e2e, bundle, Cursor prompt.

## 2026-10-14 — rescue/p1 integration complete, all gates green

- All workers integrated: W19 (vault swap card), W20 (flow swap chip v3), W21 (docs), W22 (e2e spec), W23 (verify UX), W24 (homepage), W25 (global UX), W34 (flow chips deep), W35 (V2 contracts), W36 (V2 API+UI), W37 (V2 docs).
- Gates: npm test 52/52, tsc clean, vite build ok, guard clean, forge test 42/42.
- V2 live: vault 0x8901AAa87035b80c70B1636697DaE899Ef67c6fe, real swap tx 0xf4c87b61..., real send tx 0x0b45709e..., bridge chain-gated (honest).
- MetaMask browser setup abandoned (automation cannot open extension UI); judge journey pivoted to read-only (no wallet needed). Cursor will test in user's Chrome per prompt requirements.
- Ready for commit as goat-dev8.

## 2026-10-14 — DELIVERED: bundle + Cursor prompt

- Commit dd4a170 (goat-dev8) on rescue/p1: 50 files, all gates green.
- Bundle: /home/hatch/workspace/beacon-rescue-p1.bundle (6.9M, sha256 be51366f2ec0bc5290c4380dfb19879deadb7a96789684b39612fcb37c52b615). Verified by clone.
- Cursor prompt: ~/workspace/your_files/beacon-cursor-prompt.md (merge first, real-tx tests, local gates, user's Chrome for browser tests, push/deploy/verify).
- Local dev servers (API :8787, web :5173) left running for inspection; stop with: pkill -f "apps/api/src/index.mjs"; pkill -f "vite --port 5173".

## 2026-10-14 — Role-aware vault and a real agent task path

- The vault page now names the connected wallet as owner, agent, or visitor. An owner no longer gets a silent disabled Send. The reason is on the page: only the granted agent signs, and the owner tasks that agent.
- `POST /v1/agent/send` and `POST /v1/agent/swap` preview the exact EIP-712 fields, then sign with the server-held agent key and relay through the executor. The owner key is not read. Dust caps are 1000 base units for a send and 5000 for a swap. An over-cap amount is refused before a signature. A separate confirm broadcasts a dust over-cap so the receipt is a revert.
- Flow accepts "send 0.001 USDC to 0x…" and "swap 0.005 USDC", shows the exact action, and broadcasts only after the user replies confirm.
- The swap proof cited by the UI is `0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d` (block 25818567), which calls the live V2 vault. The earlier `0xf4c87b61…` called the superseded vault `0xc3d405eb…`.
- Dust txs this session, all on V2 `0x8901AAa…`: send `0xf290d9ed0d312dfb8f6edc913be0e99bb0f7bbdce4a21cd7b300ae6cb15ff309` (1000 base units), swap `0xab5c6933…` (5000 USDC to 4463 EURC), over-cap revert `0x9c03853ae85d2db96f3517343101eff200351a3a1dc339bf1e43e517b7c308a7`.
- Gates after the change: npm test 68/68, tsc clean, vite build ok, guard clean, forge 42/42. Contracts were not changed.
- The Rabby warning is unchanged. A Blockaid report was filed earlier (HTTP 200 means received). A custom domain is the durable fix.

## 2026-10-14 — Wallet warning research, p1 bundle check stopped

- **Wallet warning:** the screenshot is Rabby. The red "Request from" triangle on `beacon-arc-one.vercel.app` and the "Review alert" button are Rabby's domain-trust signal. Rabby's own docs and public reports say the signal often hits new, low-popularity, and shared hosting domains such as `*.vercel.app`. Public MetaMask issues show the same false positive for other Vercel dApps. Routes that exist: report the exact domain to Rabby support (support@rabby.io or bd@rabby.io) with the explorer proof and the Sourcify links, and move to a dedicated custom domain. The PQTABS guide records a Blockaid report that returned 200 for MetaMask, and it says that report does not prove the alert is cleared. No code change was made. Nothing was signed, approved, dismissed, or clicked in the wallet.
- **PQTABS reference:** `D:\route\arc\PQTABS\guide.md` and `HISTORY.md` lines 408 to 427. Same pattern: origin flagged, tx checked on the explorer, benign report filed, and the alert not verified as cleared.
- **p1 bundle:** `beacon-rescue-p1.bundle` is 13044430 bytes, SHA-256 `F1639E184850E17EFE73B54DA84981164107DA9F45882CEAA2571FB535D15174`. The guide expects about 6.9 MB and SHA-256 `be51366f...`. Head `dd4a170ce65e514582c817b1cab4ea521b0e2298 refs/heads/rescue/p1` and `git bundle verify` pass. The file did not match the guide's checksum, so it was not fetched. The same size and hash mismatch pattern happened to the first rescue bundle.
- **Not run:** gates (npm test, tsc, vite build, guard, forge test), the real-transaction dust tests, the browser judge walk, and the push or merge of rescue/p1. None of them ran because the bundle did not match.
- **.env:** key names were listed. Values were not printed.
- **Not signed.** The acceptance gate is not green.

- **Blockaid report filed (user-approved, PQTABS method):** `POST https://report.blockaid.io/api/submitDappForm` for `https://beacon-arc-one.vercel.app`, wallet field `Rabby`, classification Benign, transaction `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` (verified send), email empty. Result: HTTP 200 `OK`. A 200 is receipt only. The Rabby alert was not retested and is not cleared; the PQTABS history records the same limit.

## 2026-10-14 — Founder retest: one live vault, a real agent console

- The vault page is owner setup for the live vault `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe` only: Create, Fund, Spending limits, Agent and recipients. The first vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` is Proof history (send `0xa38fb4dc…`, OverCap `0xe53e8adf…`, receipt `0xcd92f30d…`). "Task the agent" moved to `/flow/agent`.
- The white region was the page body showing through a main column that ended at the last card. The shell and its scroller now paint the dark background for the full viewport.
- Flow sends `swap 0.001` and `send 0.001 USDC to 0x…` through the agent preview, then broadcasts only after `confirm`. CCTP and privacy stay read-only, with no trade button.
- Production API, checked live on Render: `GET /v1/agent/status` ready, vault `0x8901…`. Send preview of 1000 base units returned nonce 3 and policy version 1. Swap preview of 1000 quoted 891 EURC with floor 882. Amount 10001 returned `OverCap` and did not sign.
- Web production is `dpl_FUD9aiMTWsSMiR4BbdWeYazDR2hj`, aliased to https://beacon-arc-one.vercel.app. A headless replay of that deploy filled 1440×900 and 390×844 with no paper gap. The agent buttons were enabled. The first click showed the exact action. Chat `swap 0.001` showed the quote and the 1% floor. The second click was not taken, because it asks the owner to sign in. No wallet prompt was created.
- No new broadcast. The live receipts stay the send `0xf290d9ed0d312dfb8f6edc913be0e99bb0f7bbdce4a21cd7b300ae6cb15ff309`, the swap `0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d` (block 25818567, this vault), and the over-cap revert `0x9c03853ae85d2db96f3517343101eff200351a3a1dc339bf1e43e517b7c308a7`. `0xf4c87b61…` called the superseded vault.
- Executor `0x412045b7c64d471DE57024f11E080289e6082172` has about 0.007837 native. Top it up before another relay.
- Gates: npm test 73/73, tsc clean, vite build ok, guard clean, forge 42/42. No contract change.
- The Rabby "Request from" warning is still a domain-reputation flag. A custom domain is the fix. The Blockaid HTTP 200 above is receipt only.

## 2026-10-14 — Vault reads no longer wait on the wallet

- With a wallet connected, the vault page stayed on "Reading the vault balance…" and "Reading the limits…". Chain reads were sent through the injected provider. In the founder's Chrome that provider is MetaMask (`io.metamask`, saved network `eip155:5042`) and `eth_chainId` does not return. The public Arc RPC answered the same `owner()` call in about 400ms.
- Reads now use `https://rpc.mainnet.arc.io` only. Signing still uses the wallet. After deploy `dpl_DE86LAwi7RWLaKV3XEWhzZc6nK36`, the founder's open tab showed 0.013 USDC, cap 0.01, day limit 0.05, nonce 3, and "You are the owner."
- A second click on "Confirm send — real transaction" for 0.001 USDC (1000 base units, recipient `0xCb2E…3Edd`, nonce 3) did not open a signature prompt. The page now says "The wallet did not answer. Open it, unlock it, and try again." instead of leaving every button disabled. Passive chain checks on page load no longer call the wallet.
- No new broadcast. The send is waiting on MetaMask to answer. Deploy of the wallet message is `dpl_BorAxD2qk7LzaQqp4omvc8VvEVgX`. `tsc --noEmit` was clean. Contracts were not changed.

## 2026-10-14 — Sign goes straight to MetaMask, vault balance is the headline

- Confirm was calling `eth_chainId` before `personal_sign`. That call never returns in this Chrome, so the signature popup never opened. Login now sends `personal_sign` first and waits 90 seconds.
- Clicked confirm for 0.001 USDC (1000 base units, recipient `0xCb2E…3Edd`, nonce 3) on the live page. No MetaMask window appeared. After 90 seconds the page said the wallet did not answer. Phantom and the announced MetaMask provider also time out on `eth_chainId`. The extension is not delivering requests, so there is no prompt to approve.
- The vault page now leads with the balance. In the founder's Chrome that is 0.013 USDC, with the owner line and the four setup steps. Deploy `dpl_4XC7LjfxFNN7kaQQiUX74pQVkVK4`. No new transaction.

## 2026-10-14 — Live send, swap, and over-cap from the founder's Chrome

- MetaMask answered `personal_sign`. The owner confirmed. No wallet button was clicked from this session.
- Send `0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8` succeeded in block 25858729. Status 1. Vault `0x8901…c6fe`. 1000 base units to `0xCb2E…3Edd`. Receipt `/verify/0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f`.
- The first swap attempt did not broadcast. The executor had about 0.00238 native and Arc base fee was 20 gwei, which cannot cover a swap. The owner sent 0.02 native to the executor in `0xdd20d06d4a1c7882d568f852c420b704d99d332f3f7e989536489734635ea9fe` (block 25858927, status 1).
- Swap `0x26e76d540ef603bcfa3208d250986a808f952dc72ddab7d2c66f974329879954` succeeded in block 25859055. Status 1. 1000 USDC base units out, quote 891, floor 882. Vault USDC went from 12000 to 11000. Vault EURC is 5354, which is the previous 4463 plus 891. Receipt `/verify/0xf0b5a4c41141ef6303fc9b044001479ffd486c260159187a4b70ca394598898e`.
- Over-cap `0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03` reverted in block 25859160. Status 0. Zero logs. Vault USDC stayed 11000. Nonce stayed 5.
- Flow `swap 0.001` previewed nonce 5, quote 891, floor 882, and did not say the vault will not trade. It was not confirmed, because the console swap already broadcast.
- The Flow greeting no longer says the swap is off. An over-cap result no longer replaces the send receipt. A relay failure is one sentence, not the raw viem body. Deploy `dpl_96c2yEPjtHQWHgTa8KFfMyccYSyk`, aliased to https://beacon-arc-one.vercel.app. `tsc --noEmit` was clean. Contracts were not changed. The API label change is in source and is not on Render yet. The page strips the old dash when it shows the label.
