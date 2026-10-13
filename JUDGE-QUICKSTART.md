# Beacon — Judge Quickstart (3 minutes, no wallet needed)

This is the fastest way to verify Beacon's core claim: **the vault that cannot be tricked** — every USDC movement is agent-signed, policy-checked, allowlist-bound, and everything else is read-only.

## Step 1 — Open a receipt (30 seconds)

Open the live receipt page for the newest on-chain action — a real payment to an independent third-party address (agent-signed, executor-relayed):

https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30

You should see `0.01 USDC · 10000 base units` paid to `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`, with a link to the Arc explorer. No wallet, no funds — anyone can inspect this. (The earlier receipt `0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a` is the first 0.01 send, which went to the owner's own address.)

## Step 2 — See the two on-chain proofs (60 seconds)

**The allowed send (success).** Transaction
[0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab](https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab)
on Arc mainnet: status **success**, one ERC-20 Transfer of **10,000 raw = 0.01 USDC**. The agent's EIP-712 signature was checked, the policy passed, the vault called `USDC.transfer` itself.

**The refused send (revert).** Transaction
[0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83](https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83)
on Arc mainnet: status **reverted** with selector `OverCap()`. The agent asked for more than the per-transaction cap, and the vault said no — **on-chain, not in a terms of service.** This is the money shot: the refusal is the product.

**The real swap — the vault traded (V2, newest).** Transaction
[0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c](https://explorer.arc.io/tx/0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c)
on Arc mainnet: status **success**, block 25808007. The agent (`0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) signed an EIP-712 swap action, the executor (`0x412045b7c64d471DE57024f11E080289e6082172`) relayed it unchanged, and the V2 vault (`0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`) executed `exactInputSingle` on the pinned Uniswap v3 USDC/EURC 0.05% pool: **5,000 USDC base units → 4,463 EURC base units**, output forced back into the vault. This is not a quote — it is a trade the firewall cannot be tricked out of.

**The real third-party payment (V1, newest send).** Transaction
[0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3](https://explorer.arc.io/tx/0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3)
on Arc mainnet: status **success** — the agent (`0xc3b183D5e4436C20282650348BE2D6c94c4142dc`) signed an EIP-712 send, the executor (`0x412045b7c64d471DE57024f11E080289e6082172`) relayed it unchanged, and the vault paid **0.01 USDC** to an independent recipient. Receipt: `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30`.

Honest note: all proofs are tiny amounts (dust-scale). The first send went to the owner's own address; the newest one pays a real third-party address. They demonstrate the *mechanism* (policy check, signature check, revert, receipt) rather than real-world payment volume.

## Step 3 — Check the contract sources (60 seconds)

All contracts are independently source-verified on Sourcify with `exact_match` (anyone can re-verify — no account, no browser session required):

V1 (send-only firewall, immutable):

- Receipt registry: https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C
- Vault factory: https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b
- Vault: https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6

V2 (adds agent-signed `executeSwap` + `executeBridge`, deployed 2026-10-13):

- Receipt registry (V2): https://repo.sourcify.dev/5042/0xcecb08b2cdacaf231b1838f20f932ad265fa2583
- Vault factory (V2): https://repo.sourcify.dev/5042/0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e
- Vault (V2): https://repo.sourcify.dev/5042/0x8901AAa87035b80c70B1636697DaE899Ef67c6fe

The Arc explorer's contract tab sits behind Cloudflare's bot check, so use Sourcify — it is the reproducible path.

## Step 4 — Try the firewall yourself (30 seconds)

Open https://beacon-arc-one.vercel.app/flow/vault (no wallet needed to read):

1. Ask the flow to prepare a send. The API returns the EIP-712 action and runs preflight.
2. Ask for an amount **over the cap**. Preflight refuses with reason `over_cap` — refused before anything is signed, nothing reaches the chain.
3. Read the swap chip: it fetches a live quote from `GET /v1/quote/swap` — Uniswap v3 QuoterV2, `venue: "uniswap-v3"`. For the **V1** vault the quote is `executable: false` **always** (that vault has no swap function — the chip carries a permanent read-only banner and a disabled "Swaps stay off" button). For the **V2** vault the same quote feeds an agent-signed `executeSwap` — proven by the real trade in Step 2. The firewall's favorite word is still no: over-cap or off-allowlist, and the chain itself enforces the refusal.

That's the whole product. A judge who never leaves the verify page and two explorer links has seen everything Beacon claims.
