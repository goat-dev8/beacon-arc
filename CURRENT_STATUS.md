# Beacon Arc — current status

Updated 2026-10-13 (rescue run + deploy). This file describes the working tree on branch `rescue/p1` (post-merge of `rescue/p0`). The rescue is pushed and deployed: `main` carries the merge (ea60339), Render is live on it, and Vercel serves the new build. Remaining verification steps are in `POST-PUSH-CHECKLIST.md`.

## V2 — EXECUTION IS LIVE (2026-10-13, user-authorized redeploy)

V1 (`0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`) is immutable and send-only, so the user authorized a redeploy: V2 adds agent-signed, policy-checked `executeSwap` (Uniswap v3, pinned pool/router, output always returns to the vault) and `executeBridge` (CCTP v2). V1 stays live and untouched — every V1 proof below remains valid.

- **V2 contracts (Arc 5042, all Sourcify `exact_match`):** registry `0xcecb08b2cdacaf231b1838f20f932ad265fa2583`, factory `0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e`, vault `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`.
- **First REAL swap (2026-10-13):** agent-signed (`0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) + executor-relayed (`0x412045b7c64d471DE57024f11E080289e6082172`) `executeSwap` — 5,000 USDC base units → 4,463 EURC base units on the pinned USDC/EURC 0.05% pool: `0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c` (block 25808007, status `0x1`; vault EURC balance verified 4463). Explorer: https://explorer.arc.io/tx/0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c
- **V2 send (2026-10-13):** `executeSend` 0.001 USDC to `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`: `0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc` (status `0x1`).
- **V2 setup:** policy maxPerTx 10000 / window 50000 / 86400s; grant 1 (agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`, scopes 7 = send+swap+bridge, 30-day expiry); funded 0.02 USDC.
- **Key technical discovery:** Arc's CCTP messenger is CCTP **v2 7-parameter** `depositForBurn` (amount, destDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold) — the 4-parameter v1 form does not exist on it. The vault hardcodes `destinationCaller=0`, `maxFee=0`, `minFinalityThreshold=1000`.
- **Bridge status — CHAIN-GATED (proven, not a contract bug):** direct EOA 7-param burn succeeds (`0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1`, Arc→Base domain 6), but Arc's messenger rejects contract-initiated burns — three minimal test contracts calling the identical function revert the same way the vault does. The V2 `executeBridge` code is correct (42/42 forge tests) and will work if Arc/Circle lifts the restriction. The UI must label bridge as chain-gated, never as working.
- A first V2 deploy (vault `0xc3d405ebb41fA8dd31D03a3118E2ea0bFebb75E2`) carried the 4-param bug and was superseded the same night — documented here so no one cites it.

## COMPLETED

- Arc mainnet 5042 contracts are live: V1 (registry `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C`, factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`, vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`) — Sourcify `exact_match` re-confirmed live 2026-10-13 for all three (links in `evidence/rescue-run-2026-10-13.md`). V2 was user-authorized-redeployed the same night (see V2 section above); V1 is untouched.
- First REAL third-party payment through the firewall (2026-10-13, all status `0x1`, dust amounts, no redeploy):
  - Fund vault 0.05 USDC: `0x7c2c493fbfdef28c499212526844eacf9a416014e26b0ad7c147b291ec668fa2`
  - Allowlist recipient `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`: `0xbb049a2aef3b36ab23d1fb94976a67aeb9a15a31b422c5a6e11116d9dcdf36d5`
  - Agent-signed (`0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) + executor-submitted (`0x412045b7c64d471DE57024f11E080289e6082172`) send of 0.01 USDC, vault nonce 1→2: `0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3`
  - Receipt recorded: actionHash `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30` (vault ✓ agent ✓ recipient=third-party ✓ amount=10000 ✓ nonce=1 ✓ exists=true). Verify page: https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30
- Earlier proofs still stand: allow-path send `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` (0.01 USDC, status `0x1`) and over-cap revert `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` (status `0x0`, selector `0x342fa66d` = `OverCap()`).
- Vault live state: balance 0.05 USDC, nonce 2, windowSpent 20000/50000, policyVersion 1, paused=false. Grant 1 (agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) active until 2026-10-15T05:06:06Z.
- Swap quotes fixed: `/v1/quote/swap` now reads Uniswap v3 QuoterV2 `0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468` (pool USDC/EURC fee 500) — live 2026-10-13: 1 USDC → 0.893125 EURC (deployed API observed 892767 base units for 1 USDC the same day; rates move, the venue doesn't). `executable: false` is kept ALWAYS ("the vault will not trade"); response includes `venue: "uniswap-v3"`, quoter, router, pool, fee. Startup squat guard: verifies `SwapRouter02.factory()` equals the pinned factory, `feeAmountTickSpacing(3000)` equals 60, and `getPool(USDC, EURC, 500)` equals the pinned pool; returns 503 `quoter not pinned` if the pin fails. Falls back to the thin-liquidity v2 router labeled `indicative: true` only if v3 fails.
- New API route: `GET /v1/receipts/export?format=csv` (bearer auth) — CSV export of registry receipts.
- API hardening: `index.mjs` now exits non-zero on DB migration failure (no silent fall-back to an empty store); `POST /v1/grants` validates the agent address; `POST /v1/auth/verify` returns 401 instead of 500 on a malformed address.
- Verify page: the "Independent RPC" cross-check now has three honest states — MATCH (green, fields agree), MISMATCH (red), UNREACHABLE (amber, with retry) — instead of the old false-negative red.
- Homepage: new `LiveProofSection` — "0.02 USDC · 2 executions · 1 refusal" with 3 contract cards (Sourcify links), 3 tx cards (owner send, third-party send, OverCap denial), and the receipt CTA. The "Not in this deploy" honesty section is untouched.
- Vault journey: `StepRail` progress nav (done/current/locked states from real chain+local state), `StepHeader` per section, accent focus rings, send button disabled on malformed recipient with an inline hint.
- Flow chat: the swap card rendered a deceptive "Confirm swap" button — replaced with a disabled "Swaps stay off — the vault will not trade". Permanent read-only banner stays above the quote. "Arc faucet" mislabel fixed; dead `onMint` wiring removed; 0G-era copy scrubbed.
- Docs: new `JUDGE-QUICKSTART.md` (3-minute wallet-free judge path); README gained a "Scope — what this build does NOT do" section with one-line obituaries; `evidence/rescue-run-2026-10-13.md` is the single-page evidence pack; `BUILD_HISTORY.md` logs the whole rescue run.
- Security pass 1: no secrets in source, all fund-moving/grant-changing routes require auth, EIP-712 domain pinned both sides, executor cannot alter signed fields (verified at both API and contract layers). Two MEDIUMs (DB fail-open → fixed; CORS `*` → open), five LOWs (three input-validation fixes applied).

## IN PROGRESS

- Post-push verification from the owner's machine (bundle fetched cleanly at `c67d0c6`, pushed as `rescue/p0`, merged to `main` as `ea60339`): Render is live on the merge commit; Vercel deployed `main` via CLI. Walk `POST-PUSH-CHECKLIST.md` wallet-free and close any red item on a new branch.
- Remaining code gaps found during the Cursor post-push pass: the `/flow/vault` page must render the read-only swap banner + disabled "Swaps stay off" button (currently only the flow-chat card has it), and the vault page's swap chip must read the v3 quote endpoint instead of the v2 router directly. `JUDGE-QUICKSTART.md` step 4 now describes the intended (fixed) state.

## BLOCKED

- Sourcify `exact_match` is the live verification path for all three contracts. The Arc explorer contract tab/API sits behind Cloudflare (403 for programmatic access) — judges should use the Sourcify links, not the explorer contract tab. That is source publication, not a security audit.
- Swap: `executable: false` is permanent for the **V1** vault — it has no swap function and is immutable. **V2 executes** (`executeSwap`, proven on-chain).
- CCTP: V2 ships a correct `executeBridge`, but Arc's messenger rejects contract-initiated burns — chain-gated (see V2 section), not a contract bug. No fake bridge is claimed.
- ERC-8004 / PQ / x402 / Privacy: capability flags only, all `executable: false`, per the README scope section.
- Acceptance gate: not green until the push + deploy lands. Git `main` is still the pre-rescue state; `rescue/p0` holds the rescue work.

## NEXT

1. Push `rescue/p0` from the owner's machine, open a PR or merge to `main` (see `PUSH-GUIDE.md`).
2. Confirm Vercel deployment shows the LiveProofSection and Render `/ready` reports chain 5042 on the new commit (see `POST-PUSH-CHECKLIST.md`).
3. After 2026-10-15T05:06:06Z, grant 1 expires — set a fresh grant before any further agent-signed demo sends.
4. V1 stays immutable — any future execution work goes through new vault versions via the factory, never a change to V1. (V2 was the user-authorized redeploy of 2026-10-13.)

## PRODUCTION URLS

- Web: https://beacon-arc-one.vercel.app
- API: https://beacon-arc-api.onrender.com
- Vault journey: https://beacon-arc-one.vercel.app/flow/vault
- New receipt (third-party): https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30
- Old receipt: https://beacon-arc-one.vercel.app/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a
- API ready: https://beacon-arc-api.onrender.com/ready
- Swap quote: https://beacon-arc-api.onrender.com/v1/quote/swap
- Receipt CSV export (bearer): https://beacon-arc-api.onrender.com/v1/receipts/export?format=csv

## CONTRACTS

| Contract | Address |
|---|---|
| USDC | `0x3600000000000000000000000000000000000000` |
| BeaconReceiptRegistry | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` |
| BeaconVaultFactory | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` |
| BeaconUsdcVault (V1, send-only) | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` |
| BeaconReceiptRegistry (V2) | `0xcecb08b2cdacaf231b1838f20f932ad265fa2583` |
| BeaconVaultFactoryV2 | `0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e` |
| BeaconUsdcVaultV2 (swap + bridge) | `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe` |
| Executor (relayer EOA, not a contract) | `0x412045b7c64d471DE57024f11E080289e6082172` |
| Owner | `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034` |
| Agent signer (grant 1, expires 2026-10-15T05:06:06Z) | `0xc3b183D5e4436C20282650348BE2D6c94c4142dc` |
| Third-party recipient (test counterparty) | `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd` |
| Uniswap v3 QuoterV2 (read-only) | `0x7DfD4F31bB1b3d3f9b3Ac8f9Ac1468` |

## TRANSACTION PROOFS

- Registry deploy `0x59c050bfb502b8a85a8313123deecadfc5ef1e3dc753cb66c66fcbf06d811b4b`
- Factory deploy `0xd2e73417d1749893d8780e46b1d8b85233c10d2198c3d3e779ec74cd0d5b98b5`
- Send `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` status `0x1`
- Over-cap `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` status `0x0` selector `0x342fa66d`
- Fund vault 0.05 USDC `0x7c2c493fbfdef28c499212526844eacf9a416014e26b0ad7c147b291ec668fa2` status `0x1`
- Allowlist third-party `0xbb049a2aef3b36ab23d1fb94976a67aeb9a15a31b422c5a6e11116d9dcdf36d5` status `0x1`
- Third-party send 0.01 USDC `0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3` status `0x1`, receipt `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30`
- **V2 swap 5000 USDC → 4463 EURC** `0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c` status `0x1` (block 25808007) — first real vault-executed trade
- V2 send 0.001 USDC `0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc` status `0x1`
- EOA CCTP burn proof (bridge chain-gate evidence) `0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1` status `0x1`

## TEST COUNTS

- `npm test`: 31/31 passed — includes v3 quoter pin tests, squat-guard refusal test, CSV export tests, grants/agent validation, auth 401-on-malformed tests. No regressions.
- Web `tsc -p apps/web/tsconfig.app.json --noEmit`: clean, exit 0.
- `npx vite build` (apps/web): success (~5.5s, chunk-size warnings only).
- `npm run guard`: clean. No TODO/FIXME in source.
- Forge: not installed in this environment — contract suite not re-run; contracts were not changed, so no new contract tests were needed.
- Playwright: e2e smoke run was in flight at commit time; results land separately.

## KNOWN LIMITATIONS

- One factory vault per owner. A second `create` reverts with `VaultExists`.
- The browser can sign a send only when the connected wallet is the registered agent.
- The API bearer is not on-chain authority. `setGrant` is.
- Native USDC and ERC-20 USDC are one pool. The UI must not add them.
- Grant 1 expires 2026-10-15T05:06:06Z — agent-signed sends after that revert `GrantExpired` until a fresh grant is set.
- All on-chain activity tonight used dust amounts (≤0.05 USDC + gas). Total real volume moved by the vault: 0.02 USDC across 2 executions.
