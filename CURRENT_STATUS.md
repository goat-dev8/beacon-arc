# Beacon Arc — current status

Updated 2026-10-13 (rescue run). This file describes the working tree on branch `rescue/p0` (commit `a67ed45`), not a claim that the acceptance gate is green. The gate is the push + deploy, which happens from the owner's machine.

## COMPLETED

- Arc mainnet 5042 contracts are live and were not redeployed: registry `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C`, factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`, vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`. Sourcify `exact_match` re-confirmed live 2026-10-13 for all three (links in `evidence/rescue-run-2026-10-13.md`).
- First REAL third-party payment through the firewall (2026-10-13, all status `0x1`, dust amounts, no redeploy):
  - Fund vault 0.05 USDC: `0x7c2c493fbfdef28c499212526844eacf9a416014e26b0ad7c147b291ec668fa2`
  - Allowlist recipient `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`: `0xbb049a2aef3b36ab23d1fb94976a67aeb9a15a31b422c5a6e11116d9dcdf36d5`
  - Agent-signed (`0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) + executor-submitted (`0x412045b7c64d471DE57024f11E080289e6082172`) send of 0.01 USDC, vault nonce 1→2: `0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3`
  - Receipt recorded: actionHash `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30` (vault ✓ agent ✓ recipient=third-party ✓ amount=10000 ✓ nonce=1 ✓ exists=true). Verify page: https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30
- Earlier proofs still stand: allow-path send `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` (0.01 USDC, status `0x1`) and over-cap revert `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` (status `0x0`, selector `0x342fa66d` = `OverCap()`).
- Vault live state: balance 0.05 USDC, nonce 2, windowSpent 20000/50000, policyVersion 1, paused=false. Grant 1 (agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) active until 2026-10-15T05:06:06Z.
- Swap quotes fixed: `/v1/quote/swap` now reads Uniswap v3 QuoterV2 `0x7DfD4F31bB1b3d3f9b3Ac8f9Ac1468` (pool USDC/EURC fee 500) — live 2026-10-13: 1 USDC → 0.893125 EURC. `executable: false` is kept ALWAYS ("the vault will not trade"); response includes `venue: "uniswap-v3"`, quoter, router, pool, fee. Startup squat guard: verifies `router.factory()` and `feeAmountTickSpacing(3000)`; returns 503 `quoter not pinned` if the pin fails. Falls back to the thin-liquidity v2 router labeled `indicative: true` only if v3 fails.
- New API route: `GET /v1/receipts/export?format=csv` (bearer auth) — CSV export of registry receipts.
- API hardening: `index.mjs` now exits non-zero on DB migration failure (no silent fall-back to an empty store); `POST /v1/grants` validates the agent address; `POST /v1/auth/verify` returns 401 instead of 500 on a malformed address.
- Verify page: the "Independent RPC" cross-check now has three honest states — MATCH (green, fields agree), MISMATCH (red), UNREACHABLE (amber, with retry) — instead of the old false-negative red.
- Homepage: new `LiveProofSection` — "0.02 USDC · 2 executions · 1 refusal" with 3 contract cards (Sourcify links), 3 tx cards (owner send, third-party send, OverCap denial), and the receipt CTA. The "Not in this deploy" honesty section is untouched.
- Vault journey: `StepRail` progress nav (done/current/locked states from real chain+local state), `StepHeader` per section, accent focus rings, send button disabled on malformed recipient with an inline hint.
- Flow chat: the swap card rendered a deceptive "Confirm swap" button — replaced with a disabled "Swaps stay off — the vault will not trade". Permanent read-only banner stays above the quote. "Arc faucet" mislabel fixed; dead `onMint` wiring removed; 0G-era copy scrubbed.
- Docs: new `JUDGE-QUICKSTART.md` (3-minute wallet-free judge path); README gained a "Scope — what this build does NOT do" section with one-line obituaries; `evidence/rescue-run-2026-10-13.md` is the single-page evidence pack; `BUILD_HISTORY.md` logs the whole rescue run.
- Security pass 1: no secrets in source, all fund-moving/grant-changing routes require auth, EIP-712 domain pinned both sides, executor cannot alter signed fields (verified at both API and contract layers). Two MEDIUMs (DB fail-open → fixed; CORS `*` → open), five LOWs (three input-validation fixes applied).

## IN PROGRESS

- Push + deploy from the owner's machine: branch `rescue/p0` (commit `a67ed45`, author goat-dev8) is committed locally and packaged as a git bundle. See `PUSH-GUIDE.md`. Vercel and Render auto-deploy on push to `main`.
- Playwright e2e smoke (W7) was still running at commit time; its in-tree changes were committed as-is and its output dir is gitignored.

## BLOCKED

- Sourcify `exact_match` is the live verification path for all three contracts. The Arc explorer contract tab/API sits behind Cloudflare (403 for programmatic access) — judges should use the Sourcify links, not the explorer contract tab. That is source publication, not a security audit.
- Swap: `executable: false` is permanent for this vault deployment — the vault has no swap function and is immutable. Quotes are read-only by design.
- CCTP: not in this deploy. The vault cannot burn or mint.
- ERC-8004 / PQ / x402 / Privacy: capability flags only, all `executable: false`, per the README scope section.
- Acceptance gate: not green until the push + deploy lands. Git `main` is still the pre-rescue state; `rescue/p0` holds the rescue work.

## NEXT

1. Push `rescue/p0` from the owner's machine, open a PR or merge to `main` (see `PUSH-GUIDE.md`).
2. Confirm Vercel deployment shows the LiveProofSection and Render `/ready` reports chain 5042 on the new commit (see `POST-PUSH-CHECKLIST.md`).
3. After 2026-10-15T05:06:06Z, grant 1 expires — set a fresh grant before any further agent-signed demo sends.
4. Do not redeploy the live vault. Any future swap/bridge execution needs a new vault version via the factory, not a change to this one.

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
| BeaconUsdcVault | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` |
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
