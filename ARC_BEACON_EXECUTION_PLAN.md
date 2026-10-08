# ARC Beacon — Master Execution Plan

**Status:** PLAN ONLY. No application code, contracts, or deploys were created by this document.  
**Date frozen:** 2026-10-08  
**Product name:** Beacon (Arc-native successor). Not “Beacon 0G with Arc support.”  
**Single plan file:** this file. Do not split it.  
**Public repo:** [https://github.com/goat-dev8/beacon-arc](https://github.com/goat-dev8/beacon-arc) (`main`). As of 2026-10-08 it contains only `README.md`. Implementation pushes here. Do not use any other GitHub repo.  
**Local evidence read:** `d:\route\Flare\arc\01-FORENSICS.md`, `02-WINNERS-COMPETITORS.md`, `workshop.md`, `archack.md`.  
**Old products inventoried:** `d:\route\Flare\beacon` (Flare / Coston2), `d:\route\Flare\0g\beacon-0g` (0G Aristotle, primary ancestor).  
**Live RPC probe:** `https://rpc.mainnet.arc.io` on 2026-10-08. `eth_chainId` = `0x13b2` = **5042**. Block `0x17b0d66`.

---

## 0. How a second engineer uses this file

Execute phases in order. Do not start Phase N+1 until Phase N exit criteria pass.

Every phase below already starts with resources, tools, skills, docs, files, env, pre-checks, acceptance, tests, and rollback. If a phase says **STOP**, stop. Do not invent a mock to keep going.

Evidence labels used everywhere:

| Label | Meaning |
|---|---|
| VERIFIED | Executed in this planning pass (RPC) or opened as a primary page on 2026-10-08 |
| DOCUMENTED | Official docs state it; not re-executed here |
| EXPERIMENTAL | Beta / unstable |
| PLANNED | Roadmap. Not callable as a product feature |
| INFERRED | Conclusion from several sources |
| UNKNOWN | Not proven. Do not code as if true |

Never upgrade UNKNOWN or PLANNED to live.

### Secrets

This plan contains **no secret values**. Operator credentials exist outside git (deployer key, GitHub token, Render key, Vercel token, Supabase URLs). They were also pasted into a chat transcript on 2026-10-08.

**Rotate all of them before implementation.** Do not print them in terminals, markdown, logs, commits, or `.env.example`. Real values live only in a gitignored `.env` and in Render/Vercel secret stores.

---

## 1. Evidence register (freeze these; re-probe in Phase 0)

Research date **2026-10-08**. Docs host that opened: `https://docs.arc.io`. Circle developer docs that opened: `https://developers.circle.com`. `github.com/arc` is **not** Circle. Official GitHub org: `https://github.com/circlefin`.

### 1.1 Network — VERIFIED this pass unless noted

| Fact | Value | Label |
|---|---|---|
| Mainnet chain id | `5042` (`0x13b2`) | VERIFIED RPC |
| Testnet chain id | `5042002` | DOCUMENTED `https://docs.arc.io/arc/references/rpc-endpoints` |
| HTTP RPC | `https://rpc.mainnet.arc.io` | VERIFIED (this probe) |
| WSS | `wss://rpc.mainnet.arc.io` | DOCUMENTED |
| Explorer | `https://explorer.arc.io` | DOCUMENTED `https://docs.arc.io/integrate/connect-to-arc` |
| Testnet RPC / explorer | `https://rpc.testnet.arc.io`, `https://explorer.testnet.arc.io` | DOCUMENTED |
| Gas token | USDC, not ETH | DOCUMENTED `https://docs.arc.io/arc/concepts/stablecoin-native-model` |
| ERC-20 USDC | `0x3600000000000000000000000000000000000000` | VERIFIED code size 1798 bytes; `decimals()` = 6 |
| Native USDC decimals | 18 (`msg.value`, `eth_getBalance`) | DOCUMENTED |
| Same economic pool | Native and ERC-20 are one USDC pool, two faces | DOCUMENTED. **Do not sum them** |
| No WUSDC | “No wrapper is deployed or supported” | DOCUMENTED |
| Finality | Deterministic, final on commit, sub-second, no reorgs of committed blocks | DOCUMENTED `https://docs.arc.io/arc/concepts/deterministic-finality` |
| EVM | Osaka, including EIP-7702; EIP-7708 native Transfer logs | DOCUMENTED `https://docs.arc.io/arc/references/evm-differences` |
| Fee floor | `maxFeePerGas` < 20 Gwei is silently dropped (no receipt) | DOCUMENTED |
| `eth_getLogs` | Max 10,000 blocks; error `-32012` | DOCUMENTED |
| Blocklist | Transfer to/from blocklisted address reverts and consumes gas; pre-mempool sender blocklist may have no receipt | DOCUMENTED |
| System Transfer emitter | `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` (18 decimals) | DOCUMENTED `https://docs.arc.io/arc/references/usdc-system-events` |
| PQ verify precompile | `0x1800000000000000000000000000000000000004` | VERIFIED `eth_getCode` = `0xef` (precompile stub, not an ABI). Algorithm SLH-DSA-SHA2-128s DOCUMENTED. **Byte-level ABI UNKNOWN** until `circlefin/arc-node` precompile source is read |
| PQ wallets | Not live. Future, likely EIP-8141 | PLANNED `https://docs.arc.io/arc/concepts/post-quantum-security` |
| Privacy / APS | Not available | PLANNED `https://docs.arc.io/arc/concepts/opt-in-privacy` and execution-layer status table |
| Arc Studio | AI builder. Deploys **testnet only**. Not a Beacon dependency | DOCUMENTED `https://docs.arc.io/ai/arc-studio` |

### 1.2 Assets — code checked 2026-10-08

| Asset | Address | Decimals | Class | Label |
|---|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 ERC-20 / 18 native | Canonical native | VERIFIED decimals + code |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 | Native at genesis, not a bridge wrap | VERIFIED decimals + code 1798. Role DOCUMENTED |
| USYC | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 | Permissioned | DOCUMENTED only. **Out of MVP** |
| cirBTC | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | Wrapped BTC | DOCUMENTED. **Out of MVP** (not a stablecoin control-plane asset) |
| WETH | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 | Bridged | DOCUMENTED. **Out of MVP** |

USDT / DAI / USDe on Arc: **UNKNOWN**. Do not hardcode them.

### 1.3 Swaps

| Venue | What is proven | Decision |
|---|---|---|
| Uniswap v4 Quoter `0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94` | VERIFIED code 6118 bytes. Docs: `https://developers.uniswap.org/docs/protocols/v4/deployments` | **Primary quote** |
| Uniswap Universal Router `0x4fcA4a51Ab4F23A7447b3284fBd7D73289A89Fb1` | VERIFIED code 24546 bytes | **Primary execute** |
| Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3` | VERIFIED code 9152 bytes | Required for UR / StableFX |
| Uniswap v2 Router02 `0x1f7d7550b1b028f7571e69a784071f0205fd2efa` | VERIFIED code 21902 bytes. SDK: `https://github.com/Uniswap/sdks` | **Fallback adapter only if v4 quote reverts.** Not a second product |
| Uniswap v3 SwapRouter02 `0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77` | DOCUMENTED in Uniswap SDK. **Not `eth_getCode`’d this pass** | Probe in Phase 0 before any v3 path |
| UniswapX | Blog says live (`https://blog.uniswap.org/uniswap-is-live-on-arc`). Reactor addresses DOCUMENTED in UniswapX playbook, not probed | **Not MVP.** Dutch orders add a filler trust path |
| Circle Swap Kit | SDK live, Arc pairs limited to USDC / EURC / cirBTC. **Router address UNKNOWN** | Do not depend on it for custody. Optional quote cross-check only |
| 1inch | API documented for chain 5042. **Router address UNKNOWN** | Not MVP |
| Curve | Announcement only. **Addresses UNKNOWN** | Not MVP |
| StableFX escrow `0xe2E5F173576B513d994073CCbDaCbE027d43DFe6` | DOCUMENTED RFQ, not an AMM | Not MVP. FX is a different product (arctan(x) already owns the story) |

**Routing decision:** one execution venue (Uniswap Universal Router) plus on-chain v4 quoter. v2 is a coded adapter behind the same interface, used only when v4 has no pool. No “multi-DEX aggregator” UI. Reason: a second router without a published address would be fake. A second live router (v2) exists only as a failover if v4 liquidity is empty — and the vault allowlist must include that router **only after** its selectors are pinned.

### 1.4 CCTP / Gateway — DOCUMENTED, TokenMessenger code VERIFIED

| Contract | Mainnet address | This pass |
|---|---|---|
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | VERIFIED code 2175 bytes |
| TokenMessengerWithFees | `0x71f54F818671cD0D7ea140Da213e5C8b5C92a408` | DOCUMENTED |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` | DOCUMENTED, probe in Phase 0 |
| TokenMinterV2 | `0xfd78EE919681417d192449715b2594ab58f5D002` | DOCUMENTED |
| MessageV2 | `0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78` | DOCUMENTED |
| CCTP domain | `26` | DOCUMENTED. **Testnet uses the same domain id and different addresses. Never mix** |
| GatewayWallet | `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` | DOCUMENTED |
| GatewayMinter | `0x2222222d7164433c4C09B0b0D809a9b52C04C205` | DOCUMENTED |
| Iris | `GET /v2/messages/{sourceDomain}?transactionHash=` | DOCUMENTED `https://developers.circle.com/cctp/howtos/resolve-stuck-attestation` |

Bridge Kit (`@circle-fin/bridge-kit`) is an SDK over CCTP, not a second bridge. **Beacon completes a bridge only when the destination `receiveMessage` (or Iris `status=complete` **and** a destination tx hash for that same burn) is observed.** Burn alone is not success.

Gateway unified balance is **not MVP**. It is custodial-style Circle infrastructure and does not strengthen the vault firewall.

### 1.5 x402

DOCUMENTED and VERIFIED as a Circle product surface, not executed:

- Facilitator runs on Arc mainnet. Asset `eip155:5042` / USDC `0x3600…0000`.
- Scheme: EIP-3009 `transferWithAuthorization`.
- `POST https://api.circle.com/v1/facilitator/x402/verify` and `/settle`.
- Production settle needs a **Circle API key**. That key was **not** in the operator secret set. **x402 execution is gated.** See Missing Inputs.
- EIP-3009 how-to (`https://docs.arc.io/integrate/relayers-and-paymasters/eip-3009-relayer`) is written for testnet chain id `5042002`. Mainnet domain chain id must be **5042**. Re-read USDC `name` / `version` from chain before signing. Do not copy the testnet tutorial blindly.

x402 is crowded (Barkeep, AgentPay, Circle’s own `arc-nanopayments` sample). It is a **rail the vault may allow**, not the product.

### 1.6 ERC-8004 — VERIFIED proxies, ABI not yet pinned

| Proxy | EIP-1967 implementation (storage slot read 2026-10-08) |
|---|---|
| Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x7274e874ca62410a93bd8bf61c69d8045e399c02` |
| Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x16e0fa7f7c56b9a767e34b192b51f921be31da34` |
| Validation `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` | `0xdb31f5d9167f8ebc8b30fbbf814c4d297c2d7f99` |

Proxy bytecode was 130 bytes. Docs: `https://docs.arc.io/arc/references/contract-addresses`. Tutorial is **testnet**. Reputation implementation address matches the 0G deployment’s implementation, which is a hint not a proof of identical ABI. **Phase ERC-8004 must `eth_getCode` the implementation and match selectors before any `register` / `giveFeedback`.** Owner self-feedback stays forbidden, same rule as Beacon 0G.

### 1.7 Competition gates — DOCUMENTED in local research

- Program: Arc Microgrants, 20 × 500 USDC. Deadline **2026-10-14 23:59 ET**.
- Must be a **working Arc mainnet** deployment, public repo, Arc-specific use. Testnet-only, decks, and already-funded clones are out.
- Field is crowded: payments, x402, invoices, payroll, swaps, bridges, launchpads, dashboards, escrow, streaming, identity. Source: `02-WINNERS-COMPETITORS.md` (268 public buidls as of 2026-10-06).
- Strong pattern: the claim is visible in contract semantics and a real tx (MergePay). Legwork’s lesson: Arc’s stablecoin gas is a mechanism, not a hosting choice.
- Public git remote is [https://github.com/goat-dev8/beacon-arc](https://github.com/goat-dev8/beacon-arc). Confirmed 2026-10-08: public `main`, one commit, `README.md` only.

### 1.8 MCP

- Arc docs MCP: `https://docs.arc.io/mcp` (search docs only).
- Circle codegen MCP: `https://api.circle.com/v1/codegen/mcp`.
- Neither is Beacon’s agent gateway. Beacon ships its own MCP that never returns a private key.

---

## 2. Product thesis

### Problem

Giving an AI agent a hot wallet on Arc is an unbounded USDC grant. The model can be wrong, the prompt can be hostile, and a leaked agent token must not be able to move the treasury. Existing Arc agents mostly wrap x402, invoices, or a server key.

### Why existing Arc products do not solve it

No audited project in the 2026-10-06 field was shown to bind an agent action to **all** of: user-owned vault, on-chain selector allowlist, per-tx and window caps, deterministic `eth_call` preflight, quote hash (target, selector, amount, minOut, deadline), and public action-hash receipt — while the agent holds **no key**. A-Identity is the closest (identity → policy → spend) and depends on an oracle. Barkeep / AgentPay settle x402. Payrun batches payroll. Uniswap routes swaps. None of those is a firewall.

### Why Arc

- The treasury asset **is** the gas asset, with two decimal faces. A product that sums them is wrong. Beacon’s accounting exists because of that split.
- Finality is pending → final, not N confirmations. Receipts must follow that.
- CCTP domain 26 is the real outbound rail, and completion is a destination fact.
- SLH-DSA verify is live and wallet PQ signing is not. Beacon can use the precompile for **policy-change authorization** without lying about wallets.
- APS is not live. Beacon must say so.

### Why Beacon

Beacon already proved the split **capability ≠ authority** on 0G: Flow/MCP proposes, policy and preflight decide, a Safe executes, the agent never sees the key. Arc keeps that mechanism and deletes the 0G job computer (Compute, Storage, TeeML, neurons, W0G).

### One-sentence product

**Beacon is the on-chain USDC firewall for AI agents on Arc: the agent can request a payment, a Uniswap swap, or a CCTP burn, and the vault executes only the exact call the policy and the quote hash already allowed.**

### Security model

| Actor | Holds | Can move funds? |
|---|---|---|
| Owner | Owner key | Yes: withdraw, set policy, pause, allowlist. High-value policy changes optionally require PQ verify (Phase PQ) |
| Executor | Server key in Render secrets | Only `Vault.execute` of allowlisted target+selector, under caps, unpaused, correct nonce |
| Agent | MCP bearer, scopes, TTL, USD C cap | **No key.** Revocation stops the bearer. Even a live bearer cannot change target after the action hash |
| Backend | Quotes, simulation | Cannot be the policy. A lying API fails `eth_call` or the vault |

### Economic model

User deposits **ERC-20 USDC (6 decimals)** into their vault. Caps are 6-decimal integers. Executor pays gas from the **executor’s own native USDC**, not from the user’s vault, unless a later explicit gas-rebate function exists (not MVP). Platform fee, if any, is a fixed bps on executed notional, taken in the same USDC transfer, capped, and shown before signing. No FX oracle. No neuron price.

### Real workflow

1. Owner connects on chain 5042, creates a vault, deposits USDC, sets caps and allowlist, unlocks a browser session (EIP-191, no value).
2. Owner mints an MCP grant: scopes, per-tx cap, window cap, TTL. Grant cannot exceed on-chain policy.
3. Agent calls `preflight` then `send` or `swap`. API simulates from the executor. Vault executes the bound call or reverts.
4. Receipt contract stores action hash, quote hash, tx hash. `/verify` reads chain. Explorer tx is the proof.

### What a judge checks

- Contract on Arc mainnet 5042.
- One non-deploy tx: deposit or capped `execute`.
- A second tx that **reverts**: over-cap, bad selector, or paused.
- Repo tests. No 0G imports. UI states match chain, including empty and denied.

### Moat test

Could the strongest neighbor add this without a rewrite?

- **x402 apps:** yes they can add a chat UI; **no** they cannot add quote-bound vault execution without replacing their settlement model.
- **A-Identity:** partial. If their contracts already constrain selectors and amounts, MCP is a weekend. Beacon still refuses oracles and binds the **exact calldata hash**. If Phase 0 re-read of A-Identity shows they already bind calldata, narrow the claim to “agent grant + quote hash + public action receipt” and do not pretend otherwise.
- **Uniswap:** no. They are a venue, not a custody firewall.

If the calldata binding is fake (backend can swap the router after approval), the moat is gone. Tests must fail CI if that is possible.

---

## 3. Self-critique (frozen before this plan)

### Arc protocol engineer

- Arc is load-bearing: decimal split, USDC gas, deterministic finality, CCTP domain 26, PQ **verify** precompile, blocklist, log rules. Hosting a generic wallet on 5042 would not be.
- Native vs ERC-20 is specified as one pool, two units. Vault math uses ERC-20 6-decimals only. Native balance is never added.
- Privacy and PQ wallets stay PLANNED. PQ verify stays unused until the ABI is read from `circlefin/arc-node`.

### Security auditor

| Attack | Required outcome |
|---|---|
| Agent bypasses policy | Vault revert. Test |
| Backend changes target after quote | Calldata hash mismatch. Vault revert. Test |
| Leaked MCP token | Scope, TTL, cap, and vault policy still apply. Revoke burns token. Cannot withdraw. Test |
| Owner key stolen | Agent still cannot exceed policy the attacker sets; user must pause from owner. Documented residual: owner key **is** full control. Say that in the UI |
| Quote / minOut stale | Deadline + on-chain minOut. Test |
| Bridge marked done on burn | Forbidden. Test |
| Privacy label on a public tx | Forbidden. No private send button while APS is PLANNED |
| Replay | Vault nonce + EIP-3009 nonce if x402 is enabled. Test |
| Duplicate pay | Action hash unique in receipt registry. Test |
| Malicious API / RPC stall | No success UI without receipt or tx status `0x1`. Pending ≠ success |
| PQ verify skipped | Policy update that requires PQ reverts if proof missing. If ABI still UNKNOWN, the function is not deployed |

### Hackathon judge

- 30-second story is the one-sentence product above.
- Main claim is a vault `execute` and a reverted over-cap, both on explorer.
- This is not “x402 wallet + swap + bridge” if those three are **calls the vault allows**, and the demo leads with deny-then-allow.
- Arc is necessary because of USDC dual-unit accounting and finality, not because the logo changed.
- Worth continuing if the vault is small, tested, and the agent has no key.

Weak claim rejected: “we integrated every Circle kit.” That is decoration.

---

## 3.1 Security revision (2026-10-08) — supersedes executor-chosen calldata

The earlier `execute(target, data, actionHash)` design is **rejected**. If the backend builds `data` and the hash, a compromised executor can still choose the recipient. Hashing a payload the executor wrote does not constrain the executor.

**Final mechanism: owner-registered agent key signs an EIP-712 action. The executor only relays that signature. The vault builds the USDC transfer itself.**

| Authority | What they sign or set | What they cannot do |
|---|---|---|
| Owner | Policy, recipient allowlist, blocklist, grant (agent address, caps, scopes, expiry), withdraw, pause | — |
| Agent key | EIP-712 `Action` over chain, vault, grant, nonce, class, token, recipient, amount, tokenOut, amountOutMin, quote hash, deadline, policy version | Withdraw, change policy, add recipients, change the action after signing |
| Executor | Submits `(Action, signature)` | Any field change breaks the signature. Cannot invent calldata |
| Database bearer | API authentication only | Not checked by the vault. A stolen bearer without the agent key moves nothing |

EIP-712 domain: name `Beacon`, version `1`, `chainId` 5042, verifying contract = vault.

Action typehash covers: `grantId, agent, actionClass, token, recipient, amount, tokenOut, amountOutMin, quoteHash, nonce, deadline, policyVersion`.

**Recipient policy.** `USDC.transfer` is not an open selector. The vault calls `transfer` only to `action.recipient`, and only if that address is on the owner allowlist and not on the owner blocklist. A new recipient requires an owner transaction first. Temporary recipients are allowlist entries the owner can remove. The backend cannot add one.

**Swap.** Arbitrary Universal Router commands are **not** allowed. Beacon will call Uniswap V2 `swapExactTokensForTokens` only, with `path` length 2, `tokenIn` fixed to USDC, `tokenOut` owner-allowlisted, `to` forced to the vault, `amountOutMin` and `deadline` inside the signed action. V4 command execution stays off until a command allowlist is tested. That is a security gate, not a skip of swaps: V2 router `0x1f7d7550b1b028f7571e69a784071f0205fd2efa` has verified bytecode.

**CCTP.** Status enum stays `BURNED → ATTESTED → MINTED`. `MINTED` requires a destination transaction. Burn is not complete. Not in the first contract deploy.

**Privacy.** Still not executable. Capability flag only. No private-transfer function.

**PQ.** Precompile `0x1800…0004` returns `0xef`. ABI is not pinned, so PQ is not in the first vault. Capability flag `UNAVAILABLE`. Not a PQ wallet.

**Executor statement that must stay true:** the executor can submit an authorized action, but cannot redefine what the agent signed and the owner allowed.

---

## 4. Old Beacon inventory and migration

Ancestors (do not edit them in place while building Arc):

| Tree | Chain | Unit | What it is |
|---|---|---|---|
| `d:\route\Flare\0g\beacon-0g` | 16661 | native 0G | Primary ancestor. Fastify + Vite, vault, escrow, MCP (30 tools), Zia, LI.FI, TeeML, Storage, ERC-8004 |
| `d:\route\Flare\beacon` | Coston2 114 | USDT0 | Earlier desk. x402 facilitator, SwapDesk, LayerZero OFT, Flare FDC/FTSO. 18 MCP tools |

Patterns worth **rewriting**, not copying: safe-session EIP-191, MCP grants/scopes/OAuth, preflight, allowlisted `execute`, pause, receipt + public verify, owner-cannot-self-feedback, “four ledgers never summed” (becomes: vault USDC vs executor gas vs pending bridge vs x402 — never summed).

| Feature | Old behavior | Arc equivalent | Decision | Why |
|---|---|---|---|---|
| Beacon Safe / vault | 0G native+W0G vault; Flare ERC-20 USDT0 vault | New `BeaconUsdcVault` | **REWRITE** | New asset, new decimals, new allowlist |
| Factory CREATE2 | One vault per owner | Same shape | **REWRITE** | New bytecode |
| Spending policy | On-chain max/window/pause | Same, amounts in USDC 6dp | **REWRITE** | Load-bearing |
| Session auth | EIP-191 bearer | Same | **REWRITE** | Not chain-specific |
| MCP grants | Redis caps stacked on policy | On-chain grant + agent EIP-712; DB bearer is not authority | **REWRITE** | A stolen bearer must not move USDC |
| Preflight + eth_call | Before spend | Same, from executor | **REWRITE** | Moat |
| Action hash | keccak of bound fields | Same, chainId 5042 | **REWRITE** | Moat |
| Receipt registry | On-chain row | New contract | **REWRITE** | Proof |
| Evidence Merkle anchor | Batched roots | **DELETE from MVP** | One receipt tx is enough for the grant. Anchor returns only if receipt volume needs it |
| Job escrow + Compute | Lock 0G, GPU job, release | **DELETE** | 0G-only. No fake “AI job” |
| 0G Storage evidence | Encrypted upload | **DELETE** | No replacement that pretends to be 0G Storage. Action hash + tx is the proof |
| TeeML / EIP-191 model policy | ALLOW/DENY from a TEE model | **DELETE** | No Arc TEE catalog. Do not fake. Optional later: a model may *recommend*; vault still enforces |
| Neurons / router-api.0g.ai | Pricing | **DELETE** | |
| W0G | Wrap | **DELETE** | Arc has no WUSDC |
| Zia swap | exactInputSingle | Uniswap UR | **REPLACE** | Live code verified |
| LI.FI bridge | User signs source | CCTP | **REPLACE** | Official burn/mint. User signs other chains. Vault may burn only on Arc |
| x402 | Flare on, 0G off | Vault-allowed EIP-3009 **if Circle key exists** | **REPLACE, gated** | Crowded; not the headline |
| ERC-8004 | Agent 3531902 on 0G | Arc proxies if impl ABI matches | **REWRITE, gated** | Proxies exist. Do not reuse 0G agent id |
| Flow chat jobs (image, research) | 0G models | **DELETE** | Not a GPU product |
| Inspect address/tx | Live RPC | **KEEP idea, REWRITE** | Arc RPC only |
| History | API + chain | Chain receipts + optional index | **REWRITE** | |
| SwapDesk / FTSO / FDC / FXRP / LayerZero | Flare | **DELETE** | Wrong chain |
| Flare FCC hardware TEE | Cannot move funds | **DELETE** | |
| Video / x402 flags / Comfy | Various | **DELETE** | |

---

## 5. Target architecture

```
Owner wallet (5042)
  → BeaconVaultFactory.create
  → BeaconUsdcVault (ERC-20 USDC, 6dp)
  → policy + allowlist + pause + nonce
Agent key (registered by owner)
  → EIP-712 Action (recipient, amount, nonce, deadline, policyVersion)
  → Beacon MCP bearer is API auth only
  → executor relays (Action, signature) and cannot edit fields
  → vault builds USDC.transfer to the signed, allowlisted recipient
  → swap, if enabled, is V2 swapExactTokensForTokens with output forced to the vault
  → vault records the action hash on BeaconReceiptRegistry
  → /verify reads registry + explorer
```

| Layer | Choice | Why |
|---|---|---|
| Web | Vite React on **Vercel** | Same as Beacon 0G. Public `VITE_*` only |
| API | Fastify on **Render** | Executor key stays here |
| DB | **Supabase Postgres** for grants, sessions, idempotency, indexer cursor | Justified in §7. Not for balances |
| Cache | Postgres is enough for MVP. Redis only if grant hot path misses latency budget | Do not add Upstash by habit |
| Contracts | Foundry. Verify on `https://explorer.arc.io` | |
| Agent | MCP JSON-RPC, no key export | |
| Index | API poller, `eth_getLogs` pages ≤ 9,999 blocks | Finality: committed block is final. Still handle pending, dropped, status 0 |
| Quotes | On-chain Uniswap v4 Quoter | No Swap Kit key required |
| Bridge | CCTP + Iris | Phase after core firewall |
| PQ | Precompile call only after ABI pin | Not a wallet |
| Privacy | `GET /v1/capabilities` returns `privacy: PLANNED` | No send path |

### Decimal law (invariants)

1. Policy, quotes, MCP caps, receipts store USDC as **uint 6-decimal**.
2. `msg.value` is **18-decimal native** and is **0** on vault `execute` in MVP (no native spend from the vault).
3. Never display or add `eth_getBalance(vault) + balanceOf(vault)`.
4. If Phase 0 shows they are the same funds scaled by `1e12`, document the scale and still do not add them.
5. Gas paid by the executor is a separate ledger, 18-decimal, labeled “executor gas”, never added to “you spent”.

### Contracts (minimum)

#### `BeaconUsdcVault`

- **Purpose:** hold user USDC; executor runs allowlisted calls inside policy.
- **State:** `owner`, `executor`, `paused`, `maxPerTx`, `windowLimit`, `windowSeconds`, `windowStart`, `windowSpent`, `nonce`, allowlist `target → selector → bool`, `usdc` immutable.
- **Roles:** owner (policy, withdraw, pause, executor rotation, allowlist). Executor (`execute` only).
- **Functions:** user deposits by `USDC.transfer` to the vault. Owner: `withdraw`, `setPolicy`, `setPaused`, `setExecutor`, `allowRecipient`, `blockRecipient`, `setGrant`, `revokeGrant`. Executor: `executeSend(Action, signature)` and, later, `executeSwap(Action, signature)`.
- **`executeSend` checks:** not paused; caller is executor; EIP-712 signer equals the grant’s agent; grant active and unexpired; scope includes send; `token` is USDC; recipient is allowlisted and not blocked; amount within vault and grant caps; window; `nonce` matches then increments; `deadline`; `policyVersion`. The vault calls `USDC.transfer(recipient, amount)` itself. There is no caller-supplied calldata.
- **Value:** `msg.value == 0`.
- **Events:** `PolicySet`, `Paused`, `Executed`, `Withdrawn`.
- **Invariants:** executor cannot withdraw, set policy, pause, or change allowlist. Spent in window never exceeds `windowLimit`. Balance delta of a successful execute ≤ `amount`. Revert restores nonce (call is inside the tx).
- **Replay:** nonce in the hash.
- **Emergency:** owner `setPaused(true)`.
- **Upgradeability:** **none** for MVP (no proxy). Bug → new factory version, user withdraws and migrates. Say this in the UI.
- **Funds at risk:** entire USDC balance if owner key or a bad allowlist selector is set. Executor bug can spend only inside allowlist and caps.
- **Attack:** arbitrary `execute` to USDC `transfer` is allowed only if that selector is allowlisted **and** `data` recipient/amount match the hash. Do not allowlist `USDC.approve` to `address(0)` or infinite approve. Approvals are exact-amount, to Permit2 or Universal Router only, in the same calldata the hash covers. Prefer Universal Router commands that pull via Permit2 with amount bound in `data`.

#### `BeaconVaultFactory`

- **Purpose:** one vault per owner. CREATE2. Seeds allowlist: USDC `transfer` selector only, after owner review. **Swap router selectors are not seeded until the Uniswap phase pins them.**
- **Functions:** `create`, `predict`, `vaultOf`.
- **Invariant:** second create for same owner reverts.
- **No upgrade.**

#### `BeaconReceiptRegistry`

- **Purpose:** one row per action hash: vault, owner, target, amount, tx is implicit (emit), quote hash, allowed.
- **Writer:** executor or vault (vault calls registry at end of execute). Prefer **vault writes registry** so a receipt cannot exist without execute.
- **Invariant:** action hash written once.
- **No Merkle anchor in MVP.**

#### Not deployed in MVP

Escrow (no GPU jobs). Evidence anchor. x402 facilitator (use Circle’s if phase unblocks). PQ gate module (separate small contract **or** a vault function, only after ABI is known). Fake privacy contract.

### Backend modules

| Module | Responsibility |
|---|---|
| `chain` | viem client, chain id assert 5042 |
| `vault` | read policy, balances (ERC-20 only), build execute |
| `preflight` | decode calldata, check allowlist, `eth_call`, balance delta |
| `quote/uniswap` | v4 quoter; bind minOut, deadline, command hash |
| `cctp` | quote burn; track Iris; never mark done early |
| `session` | EIP-191 challenge |
| `mcp` | tools, grants, OAuth, revoke |
| `receipts` | index registry logs |
| `capabilities` | live / planned / off flags from env + chain code |

### MCP tools (MVP)

| Tool | Scope | Effect |
|---|---|---|
| `get_capabilities` | read | privacy PLANNED, pq status, chain id |
| `get_safe` | read:safe | vault, ERC-20 balance, paused |
| `get_policy` | read:policy | caps, window, allowlist hash |
| `preflight_send` | exec:send | simulate USDC transfer |
| `send` | exec:send | bound execute |
| `quote_swap` | read | on-chain quote, no tx |
| `preflight_swap` | exec:swap | simulate UR |
| `swap` | exec:swap | bound execute |
| `why_denied` | read | last revert reason |
| `verify` | read | receipt + explorer |
| `revoke_agent` | (owner session, not agent) | burn grant |
| `pause_safe` | **not granted to agent** | returns “owner must pause on web” |

Later tools, flags off until phase exit: `quote_bridge`, `track_bridge`, `x402_pay`, `register_agent`.

### Frontend surfaces (only these)

| Screen | Data | Empty | Error | Denied | Pending | Final |
|---|---|---|---|---|---|---|
| `/` | static + chain id from RPC | — | RPC down | — | — | — |
| `/vault` | factory + USDC balance | no vault → create | wrong chain | — | tx pending | code at predict address |
| `/policy` | on-chain policy | defaults | owner-only | session missing | setPolicy pending | event |
| `/agent` | grant list from DB + cap ≤ policy | no grant | — | revoked | — | token shown once |
| `/send` | preflight | — | sim revert | over cap | pending | receipt link |
| `/swap` | quoter | no pool → honest “no route” | quoter revert | allowlist missing | pending | amounts from logs |
| `/activity` | registry logs | none | indexer behind → “chain is source, index lagging” | — | — | explorer |
| `/verify/:hash` | `eth_call` registry | unknown hash | — | — | — | match action hash |
| `/bridge` | hidden until CCTP phase | — | — | — | burn ≠ done | dest tx |
| Privacy page | **do not build.** Capabilities JSON only |

Wallet: viem + WalletConnect. Reown project id is a **missing input** if not already in the old gitignored env. Do not read `.env` into this plan.

### Failure map (code + test + signal)

| Failure | Behavior | Test | Signal |
|---|---|---|---|
| Agent token leaked | cap + allowlist + revoke | integration | audit row `revoked` |
| Owner key compromised | residual full control; UI says so | manual | — |
| Policy paused | execute reverts | forge | `Paused` |
| Stale quote | deadline revert | forge | — |
| minOut too low | router revert, vault state unchanged | fork or mainnet tiny | status 0 |
| Bridge route swapped | calldata hash mismatch | forge | — |
| Recipient blocklisted | USDC revert, gas consumed, no success UI | mainnet only if a known blocked address is documented; else unit-test with mocked USDC **in forge only**, never in the app | status 0 |
| RPC stale | UI stays pending until receipt | e2e | — |
| DB down | reads of chain still work; **new grants fail closed** | integration | `/ready` 503 |
| Circle API down | x402 returns 503, no fake paid | contract test n/a | — |
| PQ ABI missing | function not deployed | CI grep | capabilities `pq: UNAVAILABLE` |
| APS missing | no private method | CI grep | `privacy: PLANNED` |
| Fee below 20 Gwei | no receipt; poller must not mark failed-as-revert until timeout | unit | `DROPPED_FEE_FLOOR` |
| Agent arbitrary call | selector not allowlisted | forge | — |

---

## 6. Environment matrix

Names only. Validation = “process exits if missing or chain id ≠ 5042”. Storage = gitignored `.env` locally; Render env for API; Vercel env for `VITE_*` only.

| Variable | Required | Where | Secret | Phase |
|---|---|---|---|---|
| `CHAIN_ID` | yes | API | no | 1 |
| `ARC_RPC_URL` | yes | API | no (public RPC) | 1 |
| `ARC_EXPLORER` | yes | API + web | no | 1 |
| `ARC_USDC` | yes | API | no | 1 |
| `ARC_EURC` | quote only | API | no | 7 |
| `UNISWAP_V4_QUOTER` | yes for swap | API | no | 7 |
| `UNISWAP_UNIVERSAL_ROUTER` | yes for swap | API | no | 7 |
| `PERMIT2` | yes for swap | API | no | 7 |
| `CCTP_TOKEN_MESSENGER_V2` | bridge phase | API | no | 12 |
| `CCTP_MESSAGE_TRANSMITTER_V2` | bridge phase | API | no | 12 |
| `CCTP_DOMAIN` | `26` | API | no | 12 |
| `IRIS_API_BASE` | bridge phase | API | no | 12 |
| `ERC8004_IDENTITY` | rep phase | API | no | 14 |
| `ERC8004_REPUTATION` | rep phase | API | no | 14 |
| `PQ_VERIFY` | pq phase | API | no | 13 |
| `DEPLOYER_PRIVATE_KEY` | deploy | local only | **yes** | 5 |
| `EXECUTOR_PRIVATE_KEY` | runtime | Render | **yes** | 6 |
| `SESSION_SECRET` | yes | Render | **yes** | 6 |
| `DATABASE_URL` | yes | Render, pooler 6543 | **yes** | 6 |
| `DIRECT_URL` | migrations | local / CI | **yes** | 6 |
| `BEACON_VAULT_FACTORY` | after deploy | API + `VITE_` | no | 5 |
| `BEACON_RECEIPT_REGISTRY` | after deploy | API + `VITE_` | no | 5 |
| `VITE_API_URL` | web | Vercel | no | 9 |
| `VITE_CHAIN_ID` | `5042` | Vercel | no | 9 |
| `VITE_RPC_URL` | web | Vercel | no | 9 |
| `VITE_WALLETCONNECT_PROJECT_ID` | web | Vercel | public project id | 9 |
| `GITHUB_TOKEN` | push | local only | **yes** | git |
| `RENDER_API_KEY` | deploy | local only | **yes** | 17 |
| `VERCEL_TOKEN` | deploy | local only | **yes** | 17 |
| `CIRCLE_API_KEY` | **x402 only** | Render | **yes** | **MISSING** |

Banned in Arc repo: `ZEROG_*`, `COMPUTE_API_KEY`, `ZIA_*`, `COSTON2_*`, `GROQ_API_KEY`, `SIMULATED_TEE`, `W0G`, Flare contract addresses.

`DATABASE_URL` / `DIRECT_URL`: operator already has a Supabase pooler in eu-west-1. Use transaction mode (6543) for the app and session mode (5432) for migrations. Do not commit the URL.

---

## 7. Database — justified rows only

Chain is the source of truth for balances, policy, allowlists, receipts, pauses.

| Table | Why chain is not enough | Consistency | Recovery |
|---|---|---|---|
| `agent_grants` | Bearer secret cannot live on-chain; revoke must be instant | DB revoke **and** vault still enforces caps if DB is bypassed | Lose DB → all grants dead (fail closed). Vault funds safe |
| `sessions` | Challenge nonces | short TTL | lose → re-login |
| `action_idempotency` | stop double-submit of the same action hash | unique action hash | replay returns the existing tx hash |
| `indexer_cursor` | log page checkpoint | rewind 10k blocks on restart | re-read logs; unique event keys |
| `deny_log` | `why_denied` UX | best-effort | loss is OK |

**Not stored:** balances, “successful swap” without tx hash, fake history.

Indexer rules:

- Page `eth_getLogs` with span ≤ 9,999.
- USDC ERC-20 `Transfer` emitter is `0x3600…0000` only.
- Native gas `Transfer` emitter is `0xffff…ffE` and is **not** user spend.
- ERC-20 `transfer` may emit two logs (token + system). Dedupe by `(txHash, logIndex)` and never add both amounts.
- Gas deductions have no user-spend Transfer. Do not invent one.
- EIP-3009: payer is the authorizer, not `tx.from`.
- Committed blocks are final (no reorg rollback). Pending txs can drop. `status=0` is failure.
- Restart test and duplicate test are mandatory.

---

## 8. Feature matrix

| Feature | Status | Arc-load-bearing | MVP | Proof | Reason |
|---|---|---|---|---|---|
| ERC-20 USDC vault | LIVE token | Yes | MUST | deposit + withdraw txs | Treasury |
| Native/ERC-20 not summed | DOCUMENTED split | Yes | MUST | unit tests | Footgun |
| Policy caps, pause, allowlist | new | Yes | MUST | revert tx | Firewall |
| Quote-bound execute | new | Yes | MUST | forge + mainnet | Moat |
| MCP, no key | new | Agent UX | MUST | revoke test | Product |
| Uniswap v4 quote + UR | VERIFIED code | Yes | MUST | tiny swap or honest no-route | Real venue |
| Uniswap v2 failover | VERIFIED router code | No | SHOULD | only if v4 empty | Not a second product |
| 1inch / Curve / Swap Kit custody | UNKNOWN addresses | No | DO NOT | — | Would be fake |
| CCTP out + dest proof | DOCUMENTED, messenger code VERIFIED | Yes | SHOULD | burn + Iris complete + dest tx | Crowded if it is the headline |
| Gateway | DOCUMENTED | No | DO NOT | — | Not the firewall |
| Send USDC | LIVE | Yes | MUST | transfer tx | Basic |
| EIP-3009 / x402 | DOCUMENTED, key MISSING | Partial | LATER | — | Gated |
| Batch payroll | crowded | No | DO NOT | — | Payrun |
| ERC-8004 | proxies VERIFIED | Partial | SHOULD | register tx after ABI match | Reputation after real executes |
| PQ verify on policy | precompile stub VERIFIED, ABI UNKNOWN | Yes if ABI pins | SHOULD | one verify tx | Not a PQ wallet |
| PQ wallet | PLANNED | — | DO NOT claim | — | |
| Privacy / APS | PLANNED | — | capability flag only | — | Never fake |
| Selective disclosure | UNKNOWN | — | DO NOT | — | |
| Arc Studio | testnet builder | No | DO NOT | — | |
| App Kit as the product | SDK | No | DO NOT | — | Accelerator only |
| Earn / Borrow kits | testnet examples | No | DO NOT | — | |
| Indexer | needed for history | Yes (log rules) | MUST minimal | replay tests | |
| Merkle anchor | old Beacon | No | DO NOT | — | |
| 0G Compute/Storage/TeeML | old | No | DELETE | CI ban | |
| Inspect | RPC | Weak | SHOULD | live `eth_getCode` | Small, real |
| Gas reserve inside user vault | easy to double-count | Dangerous | DO NOT | — | Executor pays gas |

---

## 9. MVP cut

**MUST (submission-grade):** factory, vault, policy, allowlist for USDC `transfer` and (once pinned) Universal Router, preflight, MCP send + swap, receipt registry, `/verify`, deny path, mainnet txs, tests, no mocks, no 0G.

**SHOULD (same repo, after MUST is proven):** CCTP track-to-destination, ERC-8004 if ABI matches, PQ policy co-sign if ABI matches.

**LATER:** x402 when `CIRCLE_API_KEY` exists; v2 failover; EURC swaps.

**DO NOT:** privacy transfers, PQ wallets, Gateway, payroll batches, launchpads, GPU jobs, Arc Studio, fake quotes, or pushing Beacon to any repo other than `goat-dev8/beacon-arc`.

---

## 10. Global test law

Forge for invariants. API integration against Arc RPC (reads) and Anvil **only** for local logic that does not claim Arc semantics. Arc-specific behavior (fee floor, dual logs, blocklist, finality) is tested on **mainnet or Arc’s own tooling**, not generic Anvil. Docs: local EVM does not reproduce Arc (`01-FORENSICS.md` §5.5). Arc Foundry is DOCUMENTED (`https://docs.arc.io/arc/tutorials/install-arc-foundry`); repo URL was UNKNOWN on 2026-10-08. Phase 0 resolves that URL or the tests stay “forge unit + mainnet smoke” and the plan does not pretend Anvil is Arc.

CI fails if:

- chain id ≠ 5042 in shared constants
- banned 0G/Flare strings appear in `apps/`, `packages/`, `contracts/` (allow list: this plan file and a `MIGRATION.md` note)
- `privacy` success path or “private transfer” function exists
- a UI string says success without a tx hash
- secrets scan hits `-----BEGIN`, `ghp_`, `rnd_`, `vcp_`, `postgresql://`
- mock balance modules exist

---

# Execution phases

---

## Phase 0 — Lock assumptions

**Objective:** Re-run every VERIFIED probe. Resolve PQ ABI and Arc Foundry URL. Read A-Identity enough to keep the moat honest.  
**Why:** This plan is void if USDC decimals, chain id, or router code changed.  
**Preconditions:** Network access. No keys required.

### Resources to read

- This file §1
- `d:\route\Flare\arc\01-FORENSICS.md` §§4–5
- `d:\route\Flare\arc\archack.md` sections on decimals, indexing, PQ
- `https://docs.arc.io/arc/references/contract-addresses`
- `https://docs.arc.io/arc/concepts/stablecoin-native-model`
- `https://docs.arc.io/arc/concepts/post-quantum-security`
- `https://github.com/circlefin/arc-node` precompile docs
- A-Identity repo linked from `archack.md` (spending enforcement)

### MCPs / tools

Web fetch, public RPC, `cast` if installed.

### Skills

None required. Do not start app skills.

### Env

None.

### Pre-checks

```bash
curl -s https://rpc.mainnet.arc.io -H "content-type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}"
```

Expect `0x13b2`.

### Work

1. `eth_getCode` + `decimals()` on USDC and EURC.
2. `eth_getCode` on UR, v4 quoter, v2 router, Permit2, TokenMessengerV2, MessageTransmitterV2.
3. Read PQ precompile source. If the ABI (selector, input lengths: docs mention vk 32 bytes, sig 7856 bytes in local `archack.md` — **confirm in source**) is not explicit, set PQ phase to **STOP**.
4. Find Arc Foundry release URL. If missing, record UNKNOWN.
5. Skim A-Identity contracts for calldata binding. Write 10 lines into the phase notes: overlap yes/no.
6. Probe one address: `balanceOf` vs `eth_getBalance` scale. Do not send funds.

### Tests

The probe script is the test. Save JSON **without** any private key to `evidence/phase0-probes.json` (created in Phase 1).

### Acceptance

Chain id 5042. USDC decimals 6. UR and quoter still have code. PQ either ABI-pinned or explicitly UNAVAILABLE.

### Failure / rollback

If chain id ≠ 5042, **STOP the whole project**. If USDC address has no code, **STOP**. Do not switch to testnet to “keep moving.”

### Exit proof

Probe JSON committed later with addresses only.

---

## Phase 1 — Repository skeleton and bans

**Objective:** Implementation tree whose only remote is `https://github.com/goat-dev8/beacon-arc`.  
**Why:** That repository already exists and is the Beacon Arc remote. It is not a Solana project. Do not push this work anywhere else.  
**Preconditions:** Phase 0 pass. Remote `main` is still the placeholder README, or later commits are Beacon Arc only.

### Resources

- `d:\route\Flare\0g\beacon-0g\package.json` (workspace shape only)
- `d:\route\Flare\0g\beacon-0g\scripts\guard-fallbacks.mjs` (pattern for the ban script)
- `d:\route\Flare\0g\beacon-0g\.github\workflows\ci.yml`

### MCPs / tools

git, node 20+, foundry, GitHub.

### Skills

None.

### Env

`GITHUB_TOKEN` local only, for push. Not in files.

### Files to create

Local root: `d:\route\Flare\arc` (the GitHub tree). Do not create a second `beacon/` folder.

- `package.json` workspaces: `packages/shared`, `packages/execution`, `packages/swap`, `packages/mcp`, `apps/api`, `apps/web`
- `packages/contracts` Foundry
- `.gitignore` including `.env`, `.env.*`, `!.env.example`
- `.env.example` with **names and empty values**
- `scripts/guard-bans.mjs`
- `README.md` one page: product sentence, chain 5042, no 0G

### Files not to touch

`d:\route\Flare\0g\beacon-0g\**`, `d:\route\Flare\beacon\**`. Do not clone or push any other GitHub repository into this tree.

### Pre-checks

```bash
git remote -v
```

The only `origin` URL allowed is `https://github.com/goat-dev8/beacon-arc.git`. If `origin` is anything else, stop and fix the remote before the first commit.

### Tests

`node scripts/guard-bans.mjs` exits 0 on the skeleton and exits 1 if `0g.ai` or `evmrpc.0g.ai` is added.

### Acceptance

Empty app boots nothing yet. Guard passes. `.env.example` has no real secrets.

### Rollback

Delete `d:\route\Flare\arc\beacon` if created in the wrong place.

### Exit

`origin` is `goat-dev8/beacon-arc`. First implementation commit has no secrets (`git log -p` secret scan) and is pushed to `main` only after that scan.

---

## Phase 2 — Shared constants and decimal library

**Objective:** One module owns addresses and 6-vs-18 conversion.  
**Why:** A 10^12 bug is the Arc-specific failure mode.  
**Preconditions:** Phase 1.

### Resources

- `https://docs.arc.io/arc/concepts/stablecoin-native-model`
- Phase 0 JSON

### Env

`CHAIN_ID=5042` asserted at import.

### Files

`packages/shared/src/constants.ts`, `units.ts`, `units.test.ts`.

### Functions

- `erc20ToNative(amount6)` and `nativeToErc20(amount18)` with explicit remainder rules (round down, never invent dust as user spend).
- `assertNotSummed()` is not a function that sums. Tests show a helper that **throws** if a caller passes both balances into one total.

### Tests

- 1 USDC ERC-20 = `1_000_000` ≠ `1e18`
- Adding them is what the test forbids
- Chain id constant 5042
- Addresses match Phase 0

### Acceptance

`npm test` green for shared only.

### Rollback

Revert the package.

### Exit

Unit file proves the 10^12 trap.

---

## Phase 3 — Contracts

**Objective:** Factory, vault, receipt registry as specified in §5.  
**Why:** Policy must be on-chain.  
**Preconditions:** Phase 2. ABI of USDC `transfer(address,uint256)` selector `0xa9059cbb` pinned in comments.

### Resources

- `d:\route\Flare\0g\beacon-0g\packages\contracts\src\BeaconNativeVault.sol` (shape only; do not copy W0G)
- `d:\route\Flare\beacon\packages\contracts\src\BeaconAgentVault.sol` (ERC-20 execute shape)
- OpenZeppelin `Ownable` only if audited version is vendored. Prefer a 20-line owner check to keep the surface small.

### Tools

Forge.

### Env

None to deploy yet.

### Files

`packages/contracts/src/BeaconUsdcVault.sol`  
`packages/contracts/src/BeaconVaultFactory.sol`  
`packages/contracts/src/BeaconReceiptRegistry.sol`  
`packages/contracts/test/*`

### Tests (forge)

- executor cannot withdraw, setPolicy, pause, setAllowed
- owner can
- execute reverts if paused, over max, over window, bad selector, hash mismatch, deadline past, `msg.value > 0`
- nonce increments only on success
- USDC balance delta ≤ amount (use a mock ERC-20 **inside forge tests only**; mock is not deployed and not imported by apps)
- replay same hash reverts
- factory second create reverts
- registry second record reverts
- invariant: windowSpent ≤ windowLimit (fuzz)
- malicious token: allowlist does not include a random ERC-20; execute to it reverts

### Acceptance

`forge test` 100% of the above pass.

### Rollback

No deploy yet. Delete contracts if design changes.

### Exit

Gas report saved. No proxy. No admin upgrade.

---

## Phase 4 — Deploy and verify on Arc mainnet

**Objective:** Deploy the three contracts with the operator key. Verify source.  
**Why:** Grant requires mainnet, not a local chain.  
**Preconditions:** Phase 3 green. Deployer funded with a small USDC for gas (native). **If the deployer balance is 0, STOP** and say so. Do not fake a deploy.

### Resources

- `https://docs.arc.io/arc/references/evm-differences` (20 Gwei floor)
- `https://explorer.arc.io` verify docs (follow the explorer’s actual verify flow; do not invent a plugin)

### Env

`DEPLOYER_PRIVATE_KEY`, `ARC_RPC_URL`, `CHAIN_ID`.

### Pre-checks

- `eth_chainId == 0x13b2`
- deployer `eth_getBalance > 0`
- gas price ≥ 20 Gwei
- constructor args: USDC `0x3600…0000`, owner = deployer, then **transfer factory ownership / vault ownership to the user wallet** in the same plan, not left on the hot deployer if a separate owner is intended. Default: deployer is a throwaway; owner is `OWNER_ADDRESS` (public).

### Commands (shape)

```bash
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast --chain-id 5042
```

Exact script name is created in this phase. Record tx hashes in `evidence/deploy.json`.

### Tests

- `eth_getCode` on factory, a `create` tx, vault code, registry code
- a **non-deploy** tx: owner deposits ≥ 0.01 USDC and withdraws it, or executor execute of 0.01 USDC to owner under cap

### Acceptance

Explorer links for deploy + one value-moving tx + one **reverted** over-cap tx.

### Failure / rollback

If broadcast lands on the wrong chain, **do not continue**. There is no reorg undo. Pause is irrelevant pre-deposit. Leave the bad deployment and deploy fresh with a new salt. Never “fix” by pointing the app at testnet.

### Exit

Addresses in `.env` (gitignored) and `.env.example` left blank. README lists addresses.

---

## Phase 5 — API: chain, session, vault read, preflight, execute send

**Objective:** Fastify can read the vault and submit a bound USDC transfer.  
**Why:** The web and MCP need one enforcement path.  
**Preconditions:** Phase 4 addresses.

### Resources

- `d:\route\Flare\0g\beacon-0g\apps\api\src\index.ts` (route style only)
- `packages/execution` preflight in beacon-0g (logic to port, not import)
- viem Arc chain: `import { arc } from "viem/chains"` DOCUMENTED

### Env

`ARC_RPC_URL`, `CHAIN_ID`, `EXECUTOR_PRIVATE_KEY`, `SESSION_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `BEACON_VAULT_FACTORY`, `BEACON_RECEIPT_REGISTRY`, `ARC_USDC`.

### DB migration

Tables from §7 only. SQL in `db/migrations/001_grants.sql`.

### Endpoints

- `GET /health` liveness
- `GET /ready` checks chain id, code at factory, DB `select 1`
- `POST /v1/auth/safe-session/challenge|verify`
- `GET /v1/vault/:owner`
- `POST /v1/vault/execute-send` (session + preflight)
- `GET /v1/verify/:actionHash`

### Tests

- ready fails if RPC returns a different chain id (mock **the HTTP client in unit test**, not a fake balance)
- preflight rejects amount > max
- integration: read live USDC `decimals()` from RPC
- duplicate action hash returns the first tx, does not send twice
- executor key is never in a JSON response (test spies on `JSON.stringify`)

### Live

Send 0.01 USDC vault → owner. Record explorer URL.

### Rollback

Render not in this phase. Stop the local process.

### Exit

Local API `/ready` 200 against mainnet reads. One send tx.

---

## Phase 6 — MCP

**Objective:** Agent calls tools with a bearer. No key in any tool result.  
**Why:** This is the product surface for Cursor/Claude.  
**Preconditions:** Phase 5.

### Resources

- `d:\route\Flare\0g\beacon-0g\packages\mcp\src\tools.ts`
- `d:\route\Flare\0g\beacon-0g\apps\api\src\mcpRoutes.ts`
- MCP spec only as needed for JSON-RPC `initialize` / `tools/list` / `tools/call`

### Env

Same as Phase 5. Grant signing secret = `SESSION_SECRET` or `MCP_GRANT_SECRET` (new, secret).

### Tools

MVP list in §5. Default grant cap **cannot exceed** on-chain `maxPerTx`. No hardcoded “5 USDC” product rule; owner chooses. A UI default (for example 1 USDC / tx, 10 USDC / day, 7 days) is allowed if labeled default.

### Tests

- unauthenticated `POST /mcp` → 401
- `send` over grant cap → deny, vault nonce unchanged (assert via `eth_call`)
- revoke then same bearer → 401
- pause_safe not in default scopes
- response body regex rejects `0x` private key length 64 of the executor (compare hash, do not log the key)

### Rollback

Disable route.

### Exit

A real MCP `initialize` + `get_safe` + denied `send` against mainnet policy.

---

## Phase 7 — Uniswap swap

**Objective:** Quote on v4 quoter, execute through Universal Router, allowlist only that router’s selector.  
**Why:** Swap is real only with a verified venue.  
**Preconditions:** Phase 6. Phase 0 still shows quoter code.

### Resources

- `https://developers.uniswap.org/docs/protocols/v4/deployments` (Arc 5042)
- Uniswap v4 quoter ABI from that deployment’s official ABI (do not hand-write if the repo publishes one)
- Permit2 address §1.3

### Env

`UNISWAP_V4_QUOTER`, `UNISWAP_UNIVERSAL_ROUTER`, `PERMIT2`, `ARC_USDC`, `ARC_EURC`.

### Rules

- Pair MVP: USDC → EURC only, tiny size.
- If quoter returns 0, API returns `NO_ROUTE`. UI shows that. **No second DEX call** unless v2 adapter is explicitly enabled by env `ENABLE_V2_FAILOVER=false` by default.
- Slippage bps owner-set, default 50, max 300. Deadline ≤ 10 minutes.
- Vault allowlist gains the UR selector in a **separate owner tx** the user signs. Backend cannot add it.
- `amountOutMin` is inside the hashed calldata.

### Tests

- forge: hash breaks if minOut changes
- API: quote uses `eth_call` to the quoter address (integration, mainnet)
- stale deadline reverts
- thin/zero output is `NO_ROUTE` not a success card
- live: swap the smallest amount that the pool accepts, or record `NO_ROUTE` with the quoter revert as an honest result. Do not fallback to a fake price.

### Rollback

Owner removes UR selector. Set `ENABLE_SWAP=false` (fail closed).

### Exit

Either a mainnet swap tx from the vault or a recorded quoter `NO_ROUTE` with the raw revert. Both are acceptable. A made-up price is not.

---

## Phase 8 — Web

**Objective:** Surfaces in §5, real states only.  
**Why:** Judges and users need to see deny and allow.  
**Preconditions:** Phases 5–7.

### Resources

- `d:\route\Flare\0g\beacon-0g\apps\web\src\App.tsx` (routes to mirror in spirit, not visuals to clone blindly)
- WalletConnect / viem `arc` chain

### Env

`VITE_API_URL`, `VITE_CHAIN_ID=5042`, `VITE_RPC_URL`, `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_BEACON_FACTORY`, `VITE_USDC`.

**MISSING INPUT:** WalletConnect project id if not already issued. Where: `https://cloud.walletconnect.com`. Until then, injected-wallet (Rabby/MetaMask custom network) still works; do not block the vault on Reown.

### Tests

- Playwright (or the repo’s existing runner) against local web + live API:
  - wrong chain banner
  - create vault (if factory live)
  - send form shows preflight deny for amount above cap **before** a tx
  - no success toast without `txHash`
  - activity empty state
- Mobile width 375 and desktop 1280 for `/vault` and `/send`.

### Rollback

Do not point Vercel at the app until Phase 17.

### Exit

Browser path: connect → vault → deny over-cap → small send → `/verify`.

---

## Phase 9 — Indexer

**Objective:** Activity from logs, no double count.  
**Why:** Arc emits USDC twice if you are careless.  
**Preconditions:** Phase 5 receipts exist.

### Resources

- `https://docs.arc.io/integrate/infrastructure/indexing-events`
- `https://docs.arc.io/arc/references/usdc-system-events`
- This file §7

### Env

`DATABASE_URL`, `ARC_RPC_URL`, `ARC_USDC`.

### Tests

- fixture of two logs same tx (ERC-20 + system) → one spend
- native emitter ignored for “user spend”
- cursor restart does not duplicate
- range of 10,000 blocks is rejected by the client before RPC
- pending tx dropped → row stays `pending` then `dropped`, never `success`

### Rollback

Activity page reads registry `eth_getLogs` directly if indexer is off (`INDEXER_ENABLED=false`).

### Exit

Tests green. UI labels “indexed” vs “direct chain read”.

---

## Phase 10 — CCTP (SHOULD)

**Objective:** Vault may `depositForBurn` only for an allowlisted messenger selector. Status becomes `complete` only with destination proof.  
**Why:** Bridge without destination proof is a lie. Also crowded — do not lead the demo with it.  
**Preconditions:** Phases 4–8. MessageTransmitter code confirmed in Phase 0.

### Resources

- `https://developers.circle.com/cctp/references/contract-addresses`
- `https://developers.circle.com/cctp/concepts/finality-and-block-confirmations`
- Iris get-messages v2

### Env

`CCTP_TOKEN_MESSENGER_V2`, `CCTP_MESSAGE_TRANSMITTER_V2`, `CCTP_DOMAIN=26`, `IRIS_API_BASE`.

### Rules

- Outbound from vault: destination domain and mint recipient are inside the action hash.
- Beacon vault on Arc **cannot sign** Ethereum/Base. Inbound to Arc is a user wallet on the source chain, or it is not Beacon’s tx. Same honesty as Beacon 0G’s LI.FI note, without claiming the Safe “cannot sign” as a weakness essay — it is a chain fact.
- `track` states: `BURNED`, `ATTESTED`, `MINTED`. UI maps only `MINTED` to done.
- If Iris is down: status `UNKNOWN`, not failed and not done.

### Tests

- status parser: attestation without dest tx ≠ done
- calldata mutation of destination domain breaks hash
- live: **do not** burn a large amount. Prefer a minimum CCTP amount if one is documented; if the minimum is unknown, **STOP and record UNKNOWN** rather than burning 1 USDC blindly. Read Circle min-burn docs first.

### Rollback

Remove messenger selector. `ENABLE_CCTP=false`.

### Exit

A tracked burn that reached `MINTED`, or a written STOP with the missing minimum. No fake complete.

---

## Phase 11 — PQ policy co-sign (SHOULD, conditional)

**Objective:** Owner `setPolicy` above a threshold requires a successful precompile verify of an SLH-DSA signature over the policy hash, **plus** the owner’s classical signature (the tx itself).  
**Why:** This is the unusual Arc primitive. It is not a PQ wallet.  
**Preconditions:** Phase 0 pinned the ABI. If not, **this phase is skipped** and capabilities stay `pq: UNAVAILABLE`.

### Resources

- `https://docs.arc.io/arc/concepts/post-quantum-security`
- `https://github.com/circlefin/arc-node` precompile implementation
- `https://www.arc.io/blog/arcs-quantum-resistant-design-and-roadmap-why-it-matters`
- Local note in `archack.md`: IPQ says pair PQ with classical signatures; invalid signatures return false rather than revert — **confirm**. If false-not-revert, the vault must `require(ok)`.

### Env

`PQ_VERIFY=0x1800000000000000000000000000000000000004`

### Tests

- wrong signature → policy unchanged
- missing signature → revert
- classical owner still required (msg.sender)
- UI copy: “PQ verification on this policy change. Your wallet signature is still classical.”

### Live

One small policy update with a real SLH-DSA signature generated by a known implementation (OpenSSL or the library the Arc docs name). If no generator is documented, **STOP**. Do not check in a fake signature that the precompile has not verified.

### Rollback

Ship vault without the PQ function (already true if skipped).

### Exit

Explorer tx whose input includes the precompile call and whose policy event matches, or an explicit UNAVAILABLE flag.

---

## Phase 12 — ERC-8004 (SHOULD, conditional)

**Objective:** After a real vault execute, a **non-owner** key may `giveFeedback` pointing at `/verify/:actionHash`.  
**Why:** Reputation without a real action is fake. The 0G product already learned owner self-feedback is worthless.  
**Preconditions:** Implementation bytecode read. Selectors match the expected `register` / `giveFeedback`. If not, **STOP**.

### Resources

- Implementation addresses in §1.6
- `https://docs.arc.io/arc/tutorials/register-your-first-ai-agent` (testnet tutorial — use only for ABI orientation, then confirm on mainnet impl)
- EIP-8004 text
- `d:\route\Flare\0g\beacon-0g\apps\api\src\erc8004.ts` (flow, not addresses)

### Env

`ERC8004_IDENTITY`, `ERC8004_REPUTATION`, `ERC8004_IDENTITY_IMPL`, `ERC8004_REPUTATION_IMPL`

### Tests

- owner address calling feedback reverts in our API even if the registry allows it
- feedback URI is the verify URL
- no feedback if execute tx status ≠ 1

### Live

`register` once. One feedback after the Phase 5 send. Record both txs.

### Rollback

`ENABLE_ERC8004=false`.

### Exit

Two explorer links or STOP with selector mismatch.

---

## Phase 13 — x402 (LATER, gated)

**Objective:** Vault pays a resource via EIP-3009 only when Circle facilitator verifies and settles, and the amount is inside policy.  
**Why not MVP:** crowded, and **Circle API key is missing**.

### MISSING INPUT

```
MISSING INPUT:
CIRCLE_API_KEY
WHY NEEDED:
Circle Facilitator POST /v1/facilitator/x402/settle on eip155:5042
WHERE TO GET IT:
https://developers.circle.com/facilitator-service
CURRENT STATUS:
Not in the operator secret set as of 2026-10-08. Phase must not start.
```

### If the key appears later

- EIP-712 domain chain id **5042**, verifying contract USDC, name/version read from chain or Circle docs (re-fetch; testnet tutorial uses 5042002).
- Nonce unique. Facilitator failure → no success state.
- Do not run a local “facilitator” that returns paid.

### Tests

Replay nonce, amount mismatch, facilitator 500 → UI error.

### Rollback

Flag off.

---

## Phase 14 — Privacy capability (no engine)

**Objective:** `GET /v1/capabilities` returns `privacy: "PLANNED"` and the docs URL.  
**Why:** APS is not executable. A mock private transfer is forbidden.  
**Preconditions:** None beyond Phase 5.

### Resources

- `https://docs.arc.io/arc/concepts/opt-in-privacy`
- `https://docs.arc.io/arc/concepts/execution-layer`

### Tests

- CI ban: no function named `privateTransfer`, `shield`, `unshield`
- JSON schema has no `privateTxHash`

### Exit

Endpoint live. No button.

---

## Phase 15 — CI and secret scan

**Objective:** GitHub Actions: guard, typecheck, vitest, forge, secret scan.  
**Why:** The 0G repo’s judge bar was tests + CI. Keep it.  
**Preconditions:** Phases 3 and 5 tests exist.

### Workflow

`.github/workflows/ci.yml`

Steps: `npm ci`, `node scripts/guard-bans.mjs`, `npm run typecheck`, `npm test`, `forge test --root packages/contracts`, `gitleaks` or a small node scan for the prefixes in §10.

### Acceptance

CI green on the empty-secret example. A commit that adds `evmrpc.0g.ai` fails.

### Rollback

Fix forward. Do not `--no-verify`.

---

## Phase 16 — 0G / Flare decontamination

**Objective:** The Arc tree has zero runtime dependency on 0G or Flare.  
**Why:** This is a new product, not a bridge to the old chain.

### Scan

Ripgrep in `d:\route\Flare\arc\beacon` for: `0g.ai`, `16661`, `W0G`, `Zia`, `TeeML`, `neuron`, `Coston2`, `USDT0`, `114` as chain id, `SparkDEX`, `FAssets`, `router-api.0g.ai`.

Allowed hits: `MIGRATION.md` “removed from Beacon 0G” list, and this plan (outside the repo).

### Exit

Guard script covers the same list. CI would fail if reintroduced.

---

## Phase 17 — Vercel + Render

**Objective:** Production web and API.  
**Why:** Public URL is an eligibility artifact.  
**Preconditions:** Phases 4–9 and 15 green. Secrets rotated. No mock routes.

### API (Render)

- Root: repo root
- Build: `npm ci && npm run build -w @beacon/api` (or tsx source if that is the chosen start — pick one and test it)
- Start: `node apps/api/dist/index.js` or `npx tsx apps/api/src/index.ts`
- Health check path: `/health`
- Env: all API secrets. **No** `VITE_` secrets. **No** deployer key on the server if executor key is separate.
- After deploy: `GET /ready` must show `chainId: 5042` and factory code present.

### Web (Vercel)

- Output: `apps/web/dist`
- SPA rewrite to `index.html`
- Env: `VITE_*` only
- Wrong `VITE_CHAIN_ID` must fail the client before any send

### Post-deploy smoke

| Step | Pass |
|---|---|
| `/ready` | 200, chain 5042 |
| Web connect | network 5042 |
| Over-cap send | denied, no tx or a revert tx |
| 0.01 USDC execute | explorer status 1, `/verify` matches |
| MCP `get_safe` | balance equals `balanceOf`, not `eth_getBalance` summed |
| Capabilities | privacy PLANNED |

### Rollback

Render previous deploy. Vercel previous deployment. On-chain: owner pause. Do not upgrade contracts (there is no proxy).

### Exit

Two public URLs and the smoke table filled with real hashes in `evidence/smoke.json` (hashes only).

---

## Phase 18 — Submission packaging (only after smoke)

**Objective:** Public README with addresses, txs, and the one-sentence product. DoraHacks text.  
**Why:** Eligibility is deployment + repo + Arc-specific sentence.  
**Preconditions:** Phase 17.

### README must include

- Chain 5042, USDC address, factory, vault, registry
- Deploy tx, value tx, revert tx
- “Agent does not receive a key”
- “Privacy transfers are not live on Arc”
- PQ sentence only if Phase 11 exited with a tx; otherwise omit PQ

### Do not

Claim x402, private transfers, multi-DEX, or PQ wallets. Do not paste this plan’s missing secrets. Submit [https://github.com/goat-dev8/beacon-arc](https://github.com/goat-dev8/beacon-arc) only.

---

## 11. Consistency audit (this document)

| Check | Result |
|---|---|
| Contradictory architecture | No. One vault, one execute path |
| Privacy presented as live | No |
| PQ wallet presented as live | No |
| x402 required for MVP | No. Gated |
| 0G left as a dependency | No. Explicit delete |
| DB without reason | No. §7 |
| Unverified addresses used as if probed | Separated. MessageTransmitter, v3 router, 1inch, Curve marked |
| Git remote | `https://github.com/goat-dev8/beacon-arc` only |
| Generic Anvil = Arc | Forbidden |
| Feature without a test | Each phase names tests |
| Mock success | Forbidden in app code; forge mocks stay in `packages/contracts/test` |
| Dual USDC sum | Forbidden by Phase 2 tests |
| Bridge done on burn | Forbidden |
| Oracle policy | Not used |
| Contract upgrade admin | None in MVP |
| Missing Circle key | Phase 13 STOP |
| Git repo name | Resolved: `goat-dev8/beacon-arc` |
| WalletConnect | Optional. Injected wallet is enough |
| Stale “Arc is testnet” from `arc-node` README | Ignored. Docs + RPC win |
| Workshop “privacy works” | Ignored as launch rhetoric. Docs say PLANNED |

---

## 12. Missing inputs (do not invent)

```
MISSING INPUT:
CIRCLE_API_KEY
WHY NEEDED:
x402 facilitator settle only
WHERE TO GET IT:
https://developers.circle.com/facilitator-service
CURRENT STATUS:
Absent. Phase 13 does not start.

MISSING INPUT:
VITE_WALLETCONNECT_PROJECT_ID
WHY NEEDED:
WalletConnect QR. Not required for injected wallets.
WHERE TO GET IT:
https://cloud.walletconnect.com
CURRENT STATUS:
Unknown. Phase 8 may ship without it.
```

Deployer key, executor key, GitHub token, Render key, Vercel token, and Supabase URLs are **present in the operator secret set** and must be **rotated** because they were exposed in chat. They are not missing. They are not written here.

---

## 13. Order of execution (dependency)

```
0 probes
→ 1 repo
→ 2 units
→ 3 forge
→ 4 mainnet deploy
→ 5 API send
→ 6 MCP
→ 7 swap
→ 8 web
→ 9 indexer
→ 15 CI (can start at phase 3 and grow)
→ 16 ban scan
→ 17 host
→ 18 README
```

Parallel only after Phase 5: indexer (9) can follow receipts; CCTP (10), PQ (11), ERC-8004 (12) wait for their gates; x402 (13) waits for the key; privacy (14) is a one-endpoint add anytime after Phase 5.

---

## 14. Why this plan is the one to build

| Question | Answer |
|---|---|
| Why? | Agents must not hold a USDC key |
| Why Arc? | USDC is gas and money, with a 6/18 trap, deterministic finality, CCTP domain 26, and a live PQ **verify** precompile |
| Why now? | Mainnet is live (RPC 5042 on 2026-10-08) and the microgrant requires a mainnet deployment |
| Why this mechanism? | Quote-bound vault `execute` is enforceable without an oracle and without a TEE |
| Why this architecture? | Policy in the contract, keys on Render, public reads on Vercel, Postgres only for secrets and cursors |
| What fails? | §5 failure map |
| How tested? | Forge invariants, RPC integration, one real send, one real revert |
| How proved? | Explorer txs |
| Attack? | Leaked bearer, calldata swap, decimal sum, burn-as-complete, fake privacy |
| Rollback? | Pause, flags, no proxy, new factory if bytecode is wrong |
| If Uniswap or Iris disappears? | `NO_ROUTE` / `UNKNOWN`. Vault transfer still works. Product does not invent a price or a mint |
