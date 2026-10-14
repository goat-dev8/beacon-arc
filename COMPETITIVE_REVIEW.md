# Competitive review

Date: 2026-10-08. Source: `02-WINNERS-COMPETITORS.md` (field census 2026-10-06) and the live Beacon contracts. This is not a claim that the acceptance gate is green.

## Beacon's mechanism

The owner holds USDC in a vault. The owner sets the cap, the window, the recipient allowlist, and the agent grant. The agent signs an EIP-712 action. The executor can only submit that signature. The vault builds `USDC.transfer` itself. A changed field reverts. The public receipt is the action hash on Arc.

Arc is load-bearing because the unit is USDC, gas is USDC, and the same pool must not be counted twice. Hosting a generic wallet on chain 5042 would not be this product.

## Could a neighbor add it without a rewrite?

| Neighbor | What they already are | Could they add Beacon in a day? |
|---|---|---|
| MergePay | A GitHub event becomes a verified payout. The contract is the mechanism. | No. Their proof is an external event, not an agent-signed action bound to a recipient allowlist and a vault nonce. |
| A-Identity | Identity, then policy, then spend. Enforcement is on chain. They depend on an oracle. | Not without a rewrite. Policy is the shared idea. Beacon's enforcement is the signed action fields, not an oracle price. |
| Legwork | Recurring payments that pay the executor's gas. Arc's gas model is their mechanism. | No. A stream is not a one-shot signed transfer with a public action receipt. |
| Uniswap | The venue. The pinned v3 USDC/EURC pool is where the live vault trades. | No. A router does not custody an agent's spending cap. The live vault swaps only after an agent-signed action. The first vault is send-only. |
| Arc Payrun | Batch payroll. | No. A payroll batch is not a per-agent grant. |
| Barkeep / AgentPay / x402 | Facilitated EIP-3009 payments. | No. A facilitator key is not a vault. Beacon does not settle x402. There is no Circle key. |
| Dashboards and receipt apps | Display balances and transfers. | A screen can be copied. The vault revert cannot. |

## What this build refuses to pretend

The live vault swaps. That is proven. Standard USDC bridging from the vault is chain-gated, not a completed bridge. ERC-8004, a post-quantum wallet, privacy transfers, and x402 stay off until each one has a mainnet proof. CCTP-X for EURC is listed by Circle and is not wired.

The moat is the revert, not the number of rails. Forge covers recipient, amount, agent, grant, deadline, nonce, policy version, quote fields, and tokenOut. The sends, the swaps, and the over-cap reverts are on Arc.

## Residual

A-Identity already constrains spend with contracts. Beacon does not win by saying "we also have policy." It wins only while the executor cannot replace the signed recipient or amount. That property is tested. Sourcify `exact_match` is the source judges can open. The Arc explorer contract tab sits behind Cloudflare.
