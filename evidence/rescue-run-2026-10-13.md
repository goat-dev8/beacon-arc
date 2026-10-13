# Beacon Arc — Evidence Pack (rescue run, 2026-10-13)

Checked 2026-10-13 ~20:35 EEST (branch `rescue/p0`). Every link below was fetched today and returned content (HTTP 200 equivalent). This file lists proofs only — it does not restate or alter the existing `evidence/*.json` files.

## Contract proofs — Sourcify exact_match (all fetched 2026-10-13, page header reads "Exact Match, Runtime Bytecode, Creation Bytecode")

| Contract | Address | Sourcify link | Verified at |
|---|---|---|---|
| BeaconReceiptRegistry | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` | https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C | 2026-10-08 17:39:16 UTC |
| BeaconVaultFactory | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` | https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b | 2026-10-08 17:39:29 UTC |
| BeaconUsdcVault | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` | https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6 | 2026-10-08 17:38:56 UTC |

Compiler: solc 0.8.26+commit.8a97fa7a, EVM cancun. Deployer on all three: `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`. Deployment txs match `deployment.json` (registry `0x59c050bf…`, factory `0xd2e73417…`, vault `0x414b610b…`).

## Transaction proofs — Arc explorer (both fetched 2026-10-13, pages render)

| Proof | Tx | Explorer link | Status |
|---|---|---|---|
| Allow-path send — 0.01 USDC, `executeSend` SUCCESS | `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` | https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab | Success, block 24848449, vault → `0xBDfC…0034` for 0.01 USDC |
| Denial — over-cap `executeSend` REVERTED | `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` | https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83 | Failed, block 24848550, revert selector `0x342fa66d` = `OverCap()` |

Known context (verified on-chain today, for the judge's benefit): the 0.01 send went to the owner's own address (`0xBDfC…0034`), not an independent third party — tonight's third-party send (TODO below) closes that gap. The executor `0x412045b7c64d471DE57024f11E080289e6082172` is an EOA relayer, not a contract. Grant 1 (agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) expires 2026-10-15T05:06:06Z.

## Receipt proof — verify page (fetched 2026-10-13, renders)

- Receipt page: https://beacon-arc-one.vercel.app/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a — shows `0.01 USDC · 10000 base units`, nonce 0, vault/agent/recipient rows, explorer links.
- Known UI bug (being fixed in this rescue): the "Independent RPC" line reads *"The API did not return the same fields"* — a false negative; the registry row is on chain and the API fields match.

## Live endpoints

- Web (fetched 2026-10-13, 200): https://beacon-arc-one.vercel.app/
- API /ready: https://beacon-arc-api.onrender.com/ready — text fetch timed out this run (local worker error, NOT proof of downtime). Status docs report 200 with `chainId: 5042`; re-check before submission.

## Existing evidence files — freshness flags (2026-10-13)

- `deployment.json` (2026-10-08): core claims still accurate — code sizes (1149/6413/5047), both tx hashes/statuses, Sourcify exact_match all re-confirmed on chain today. Minor: the note "Explorer UI was not marked verified when last opened" is superseded by `source-verification.json` (2026-10-09).
- `production.json` (2026-10-08): `"verifyDeployment": "dpl_JTWnUH5rScDGuQyX21P1Htu4Pi5s"` is STALE (current Vercel deployment is newer); treat `gitHead`/`committed` fields as historical.
- `source-verification.json` (2026-10-09): Sourcify exact_match re-confirmed live today for all three contracts. Explorer *API* remains Cloudflare-walled (403) — but explorer *pages* (tx links above) loaded fine today.
- `swap-quote.json` (2026-10-08): point-in-time quote read only — historical. The V2 router (`0x1f7d…`) shows thin liquidity; the rescue replaces it with a v3 quoter read. Do not cite as a current quote.
- `test-summary.json` (2026-10-08): forge count `20` is stale (later runs report 27 passed, 256 fuzz). Do not cite the old count.
- `phase0-probes.json` (2026-10-08): core probes still accurate (chain 5042, USDC 1798 bytes, CCTP messenger 2175 bytes, PQ precompile 1 byte).

## TODO — new proofs arriving tonight (fill in, do not invent)

- [x] **Third-party send** (0.01 USDC to independent recipient `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`, agent-signed by `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`, executor-submitted by `0x412045b7c64d471DE57024f11E080289e6082172`, vault nonce 1→2):
  tx: `0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3` — explorer link: `https://explorer.arc.io/tx/0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3` — receipt actionHash: `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30` — verify-page receipt: `https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30`
  Supporting: fund vault 0.05 USDC `https://explorer.arc.io/tx/0x7c2c493fbfdef28c499212526844eacf9a416014e26b0ad7c147b291ec668fa2`, allowlist recipient `https://explorer.arc.io/tx/0xbb049a2aef3b36ab23d1fb94976a67aeb9a15a31b422c5a6e11116d9dcdf36d5` (all status 0x1, dust amounts, no redeploy).
- [ ] **Re-grant** (fresh grant after 2026-10-15T05:06:06Z expiry):
  tx: `TODO` — explorer link: `https://explorer.arc.io/tx/TODO`
- [ ] Re-check API `/ready` (200 + `chainId: 5042`) and record commit hash after Render redeploy.
- [ ] Record final Vercel deployment id after the rescue merge.

Nothing in this pack was invented. Existing proof data was read, not modified.
