# Beacon Arc — current status

Updated 2026-10-11. This file describes the working tree, not a claim that the acceptance gate is green.

## COMPLETED

- Arc mainnet 5042 contracts are live and were not redeployed: registry `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C`, factory `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b`, vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6`.
- Real send of 0.01 USDC succeeded: `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab`.
- Real over-cap revert: `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83`.
- API on Render: https://beacon-arc-api.onrender.com is live on commit `4c67940`. `/ready` reports chain 5042. Revoke without a bearer returns 401.
- Web on Vercel: https://beacon-arc-one.vercel.app deployment `dpl_9XsgV3UR8dzGUvNAGDhnh4wudy3N`. Flow chips read Arc before answering: swap quotes and checks vault selectors, CCTP reads `localDomain()`, and the cap answer includes the over-cap receipt status. Prior deployment `dpl_HSZUF431788gCVSDA7gSNTBR4LwZ` is superseded. Action buttons use a solid fill so disabled and enabled states stay readable. Activity reads the creation window and the latest 12,000 blocks. Flow answers one question from the chain: a swap chip returns the live Uniswap quote and says the vault will not trade. Create stays disabled while the vault read is in flight and says “Vault already exists” when the factory already has one. The page reads grant 1 from the vault and says this owner wallet is not the registered agent, so Sign and relay stays disabled. An unchanged policy stays off because saving would raise the policy version. Allow, block, and register stay off until a full address is entered. An empty agent field does not register the connected wallet. The browser session is described as 12 hours. A missing revoke route says the on-chain grant is unchanged.
- Verify page reads `receipts(bytes32)` for action `0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a` and shows `0.01 USDC · 10000 base units`. A non-hash id does not render a job proof.
- Local API tests: 7 passed, including MCP `initialize`, `tools/list`, over-cap `prepare_send`, revoke then 401, and a mutated amount that does not broadcast.
- Web typecheck passed after the vault journey page.

## IN PROGRESS

- Owner journey at `/flow/vault`: create, ERC-20 fund, browser session, policy, allow recipient, on-chain grant, API bearer, revoke, and signed send. Not yet exercised in a browser against production.
- Dangerous helpers `executeAgentVaultPrep` and `sendPreparedVaultTx` now throw and do not broadcast. The old jobs desk and its client still exist.
- MCP `verify` tool and `POST /v1/grants/revoke` exist in the working tree. Render is still the last pushed API (`5fcb2a1`) until a deploy.

## BLOCKED

- Contract source: Sourcify `exact_match` remains the earlier record. On 2026-10-09 the Arc explorer contract tab reports exact match through the Blockscout Bytecode Database for the vault, factory, and registry. That is source publication, not a security audit. Evidence: `evidence/source-verification.json`.
- Swap: command allowlist is not tested. Capability stays `executable: false`. No invented quote.
- CCTP: not in this deploy. Burn is not complete.
- ERC-8004: proxies have code. Implementation selectors are not matched. No registration.
- PQ: precompile is a 1-byte stub. ABI is not pinned. Not a PQ wallet.
- x402: no Circle facilitator key. No fake settlement.
- Privacy: not executable. No private-transfer function.
- Acceptance gate: not green. Git `main` is still `5fcb2a1`. The Vite app and this journey are uncommitted.

## NEXT

1. Keep the production API and the local API on the same commit once the rest of the gate is ready to push.
2. Deploy the API revoke/MCP fix to Render. The vault journey and honest verify page are already on Vercel.
3. The explorer contract tabs now report exact match. Do not describe that as a security audit.
4. Pin Uniswap on Arc before any swap execution.
5. Expand Forge coverage only if the vault bytecode must change. Do not redeploy the live vault for a cleanup.

## PRODUCTION URLS

- Web: https://beacon-arc-one.vercel.app
- API: https://beacon-arc-api.onrender.com
- Vault journey: https://beacon-arc-one.vercel.app/flow/vault
- Known receipt: https://beacon-arc-one.vercel.app/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a

## CONTRACTS

| Contract | Address |
|---|---|
| USDC | `0x3600000000000000000000000000000000000000` |
| BeaconReceiptRegistry | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` |
| BeaconVaultFactory | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` |
| BeaconUsdcVault | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` |
| Executor | `0x412045b7c64d471DE57024f11E080289e6082172` |
| Owner | `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034` |
| Agent signer used for the 0.01 send | `0xc3b183D5e4436C20282650348BE2D6c94c4142dc` |

## TRANSACTION PROOFS

- Registry deploy `0x59c050bfb502b8a85a8313123deecadfc5ef1e3dc753cb66c66fcbf06d811b4b`
- Factory deploy `0xd2e73417d1749893d8780e46b1d8b85233c10d2198c3d3e779ec74cd0d5b98b5`
- Send `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab` status `0x1`
- Over-cap `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83` status `0x0` selector `0x342fa66d`

## TEST COUNTS

- Forge, this pass: 27 passed, 0 failed, 256 fuzz runs. Field mutations revert. Contracts were not redeployed.
- API `server.test.mjs`: 8 passed, 0 failed. The swap quote test uses a mocked router read and asserts `executable: false`.
- Production HTTP: `apps/api/src/production.test.mjs` — 4 passed against Render and Vercel on 2026-10-08.
- Playwright: `npx playwright test` — 6 passed against https://beacon-arc-one.vercel.app on deployment `dpl_DtutjAnTxabLuEDtKhxvamYGCcgt`. One MCP check timed out at 5s while the button was still waiting on Render, then passed with a 30s wait.
- Web `tsc -p apps/web/tsconfig.app.json --noEmit`: passed after fixing 6 errors.

## KNOWN LIMITATIONS

- One factory vault per owner. A second `create` reverts with `VaultExists`.
- The browser can sign a send only when the connected wallet is the registered agent.
- The API bearer is not on-chain authority. `setGrant` is.
- Native USDC and ERC-20 USDC are one pool. The UI must not add them.
- Old 0G job screens remain in the tree. They are not the Arc product. The competitive reading is `COMPETITIVE_REVIEW.md`.
