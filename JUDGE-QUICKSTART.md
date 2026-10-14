# Beacon — Judge Quickstart (3 minutes, no wallet needed)

This is the fastest way to verify Beacon's core claim: the live vault cannot be talked into a payment the policy does not allow. The agent signs. The executor relays that signature and cannot change it. The vault enforces the cap, the allowlist, and the nonce.

The live vault is `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`. The first vault `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` is immutable and send-only. Its older receipts are still valid. They are not the current execution path.

## Step 1 — Open a live receipt (30 seconds)

https://beacon-arc-one.vercel.app/verify/0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f

You should see `0.001 USDC · 1000 base units` paid to `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd` from the live vault. No wallet is required.

The first vault's third-party receipt is still online: https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30

## Step 2 — See the live proofs (60 seconds)

**Allowed send.** [0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8](https://explorer.arc.io/tx/0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8) succeeded in block 25858345. 1,000 base units left the live vault.

**Allowed swap.** [0x1a3e7cea053ea5c994e9ffd22f6962b97e4e86fbe2e860dc7f1a4175a1726c7f](https://explorer.arc.io/tx/0x1a3e7cea053ea5c994e9ffd22f6962b97e4e86fbe2e860dc7f1a4175a1726c7f) succeeded in block 25859531. 1,000 USDC base units became 891 EURC base units, and the EURC returned to the vault. The larger swap is [0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d](https://explorer.arc.io/tx/0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d) (5,000 USDC base units to 4,463 EURC, block 25818567). `0xf4c87b61…` called a superseded vault and is not this vault's trade.

**Refused send.** [0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03](https://explorer.arc.io/tx/0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03) reverted in block 25859160. Zero logs. No USDC moved. The first vault's OverCap refusal is [0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83](https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83).

Counted from registry `Recorded` events on 2026-10-14: 0.030 USDC moved through policy, 8 successful executions, 3 reverted refusals. The live vault's balance after that is 0.01 USDC and 0.006245 EURC. Dust amounts. The mechanism is the claim.

## Step 3 — Check the contract sources (60 seconds)

Sourcify `exact_match` on chain 5042:

Live V2:

- https://repo.sourcify.dev/5042/0x8901AAa87035b80c70B1636697DaE899Ef67c6fe
- https://repo.sourcify.dev/5042/0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e
- https://repo.sourcify.dev/5042/0xcecb08b2cdacaf231b1838f20f932ad265fa2583

First vault, still immutable:

- https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6
- https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b
- https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C

The Arc explorer contract tab sits behind Cloudflare. Use Sourcify.

## Step 4 — Walk the product (one vault)

Open https://beacon-arc-one.vercel.app/flow/vault. This page is owner setup for the live vault: Create, Fund, Spending limits, Agent and recipients. Proof history shows the first vault and does not offer setup for it.

Open https://beacon-arc-one.vercel.app/flow/agent. **Task the agent to send** and **Task the agent to swap** are enabled when the server holds the agent key. The first click shows the exact action. The second click is the owner's confirmation and broadcasts a real transaction.

Open https://beacon-arc-one.vercel.app/flow and type `swap 0.001` or `send 0.001 USDC to 0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`. Reply `confirm` to broadcast. CCTP and privacy stay read-only. Standard USDC burns from a contract are rejected by Arc's messenger. CCTP-X for EURC is listed by Circle and is not wired into this vault.

Dust only. Do not send more than 0.01 USDC.

## What is not live

Bridge completion, privacy transfers, a post-quantum wallet, x402 settlement, and ERC-8004 registration are not executable. The homepage says so. A MetaMask "Request from" warning on `beacon-arc-one.vercel.app` is a domain-reputation alert. It is not a failed transaction and it has not been cleared.
