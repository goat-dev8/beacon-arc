# Beacon Arc

Beacon is an on-chain USDC firewall for AI agents on Arc mainnet (chain id 5042).

The owner sets the policy and the recipient allowlist. The agent signs an EIP-712 action. The executor can submit that signature and cannot change the recipient, amount, token, or deadline. The vault calls `USDC.transfer` itself. A database bearer does not move funds.

USDC on Arc is `0x3600000000000000000000000000000000000000` with 6 decimals. Native gas uses the same pool at 18 decimals. Those two views are not added together.

Privacy transfers, post-quantum wallets, and x402 settlement are not executable in this build. The product does not report them as successful.

Contracts live in `packages/contracts`. `forge test` is the contract suite. `npm test` covers decimal units and the ancestor-string guard.

Deployed on Arc mainnet:

**V1 — the send-only firewall** (immutable, untouched):

| Contract | Address |
| --- | --- |
| Receipt registry | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` |
| Vault factory | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` |
| Vault | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` |

**V2 — the firewall that trades** (deployed 2026-10-13, user-authorized redeploy):

| Contract | Address |
| --- | --- |
| Receipt registry (V2) | `0xcecb08b2cdacaf231b1838f20f932ad265fa2583` |
| Vault factory (V2) | `0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e` |
| Vault (V2) | `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe` |

All three V2 contracts are Sourcify `exact_match` on Arc (chain 5042). Same security model as V1 — the executor relays the agent's signature and cannot alter any field; the vault builds every external call itself. New in V2: agent-signed, policy-checked `executeSwap` (Uniswap v3, pinned pool/router, output always returns to the vault) and `executeBridge` (CCTP v2).

Live-vault swap (2026-10-13): agent-signed + executor-relayed `executeSwap` of 5,000 USDC base units → 4,463 EURC base units on the pinned USDC/EURC 0.05% pool — [0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d](https://explorer.arc.io/tx/0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d) (block 25818567, status success, vault `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`). An earlier swap, `0xf4c87b61…`, called a superseded vault.

The value-moving send is [0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab](https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab) (0.01 USDC, status success). The over-cap denial is [0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83](https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83) (status reverted, `OverCap`).

## Scope — what this build does NOT do

- **Swaps** — The first vault can quote and cannot swap. The live vault executes: agent-signed `executeSwap` on the pinned USDC/EURC 0.05% pool, output forced back to the vault — proven by [the real swap](https://explorer.arc.io/tx/0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d).
- **CCTP / bridging** — V2 ships a correct `executeBridge` (CCTP v2 7-parameter `depositForBurn`: `destinationCaller=0`, `maxFee=0`, `minFinalityThreshold=1000`), but **Arc's messenger currently rejects contract-initiated burns** — proven on-chain: an EOA burn succeeds ([0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1](https://explorer.arc.io/tx/0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1)), while minimal test contracts calling the same function revert identically to the vault. This is a chain-level gate, not a contract bug — the bridge code is live and will work if Arc/Circle lifts the restriction. No fake bridge is reported as successful.
- **x402 settlement** — no Circle facilitator key is configured. No fake settlement, no trial-mode theater.
- **Post-quantum wallets** — the PQ precompile is not a wallet. Beacon's threat model is trickery (prompt injection, policy bypass), not quantum cryptanalysis.
- **Private transfers** — Arc's Privacy Sector is not on mainnet. Beacon reports only what the public chain shows.
- **ERC-8004 registration** — identity is a registry's job. Beacon trusts the owner's on-chain grant — the grant is the identity.

A 3-minute, wallet-free judge path is in `JUDGE-QUICKSTART.md`.
