

# Arc Microgrants — Complete English Census

Submit: https://dorahacks.io/hackathon/arc-microgrants/detail  
Feed: https://dorahacks.io/build  
Circle mirror: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq  

Close **14 Oct 2026, 23:59 ET** (15 Oct 03:59 UTC). Rolling review. Every decision by **21 Oct**. **20 grants × 500 USDC**, paid in USDC on Arc. No equity. Promise beats traction. One project per submission. A team may file more than one distinct project. Pseudonymous is allowed until payout.

This is the public DoraHacks field as of 6 Oct 2026, including every buidl you listed and the ones the feed added. The Google-style form is private, so a buidl is not proof they clicked Submit. A missing GitHub means the scrape did not expose one, not that the repo does not exist.

Chain **5042**. RPC https://rpc.mainnet.arc.io. Explorer https://explorer.arc.io. Docs https://docs.arc.io. Native gas is USDC, 18 decimals. The ERC-20 face is 6. Same pool.

---

## What Circle already paid for, and what that implies here

HackMoney, Mar 2026, 155 teams, $10k, testnet. Recap: https://www.arc.io/blog/meet-the-arc-track-winners-from-the-hackmoney-2026-hackathon-and-what-we-learned

| Winner | Showcase | Idea |
|---|---|---|
| arctan(x) | https://ethglobal.com/showcase/arctan-x-vyjkm | FX DEX, Arc as liquidity hub, Gateway, Bridge Kit, StableFX |
| Text-to-Chain | https://ethglobal.com/showcase/text-to-chain-ncoxd | SMS wallet, CCTP cashout, no app |
| ArcFlow | https://ethglobal.com/showcase/arcflow-rwysr | Idle payroll into yield, then cross-chain salary |
| Versus | https://ethglobal.com/showcase/versus-r1rt2 | Agents earn per second, trade the revenue token |

Cannes, 2–5 Apr 2026, 69 teams, $15k. Recap: https://www.arc.io/blog/meet-the-arc-track-winners-from-ethglobal-cannes-hackathon-and-what-we-learned

Onda sent $0.01 to the artist of the song in the tab. NanoCrawl let agents pay a publisher per page. ETHastic moved value over radio and settled when a link existed.

The line they published: construction companies do not care about the chain. They want milestone pay without lawyers. Microgrants keep that taste and add the gate those rooms did not have: **the deployment must be on mainnet when you submit.** Testnet-only, decks, and work Circle already funded are out.

Older agent repos that are still testnet, so they do not qualify until redeployed to 5042: https://github.com/Godwin-web3/AgentPay, https://github.com/havelaw/arc-agent-pay, https://github.com/my5757980/arc-hackathone.

---

## Ranked proof, not pitch

**1. MergePay** — https://dorahacks.io/buidl/49215  
USDC on a GitHub issue. The merge pays the fixer. Arc’s modexp precompile checks GitHub’s RS256 OIDC token.  
https://github.com/codeswithroh/mergepay · https://mergepay.fun · https://youtu.be/EOVwi1jtfrw  
`0xcff79B144833b36ca53b310C1Ad7854AF9Ff9EeD`  
Award `0x5c78366c49509523444fe8e815abcbf6ea9b3b583253c7ca4a3112d3b509c103`  
Payout `0x24bb35a217cf4102f51acd74f82bbee6a7cdad7e597e0810f7b5cc920f594eb0`  
**0.47 USDC, 10 seconds after the merge.** This is the bar.

**2. Arc Market** — https://dorahacks.io/buidl/48995  
Agents cannot tell a real pool from a 99% fee decoy, or a dead ERC-8004 card from a rate limit. It reads four RPCs and returns `NO_DATA` with coverage when they disagree.  
Directory on babacapital.app. On 23 Sep: 185 agent IDs, 184 resolvable, 134 OK, 50 invalid, 37 owners, 16 hosts, 129 declare payment, 13 declare x402.  
PoolLens `0xADebbd5825B033bCD4B84FB019AbFC673406d902` on Arc, Base, Robinhood Chain, HyperEVM. View-only.  
Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`. Their agents: id 135 tx `0xbc5612d8d3df5216ce61963358ec2a040a71238a3d576843e36aa5d324d28cc6`, id 136 tx `0x53242c47c5900a55c3725bcb35bdc8c88d77c51f2375124f5c898790e5ec438d`.  
This is the infra grant. It uses Arc as the thing being read, and it publishes the miss.

**3. A NEW ONE** — https://dorahacks.io/buidl/48979  
One-tx USDC launch, curve, graduates at 5,000 USDC into a locked Uniswap v3 pool. On mainnet since 16 Sep, deployed by a scanner minutes after the chain opened.  
https://github.com/izzetcakmak/anewone · https://anewone.xyz  
Platform `0x3DDA5AD5E74c658aff3d082AFe404a71615B1bc5` · $NOAH `0x26Cc2b608Df6be8fF63C64C9464b2756cC5dc128`  
Videos https://www.youtube.com/watch?v=iNihhVrrGb0 · https://www.youtube.com/watch?v=WKnJCnkh2rg  
Grant ask: audit, RPC, GangWay Kit as a public CCTP V2 onboarding library.

**4. Arc Payrun** — https://dorahacks.io/buidl/49365  
Up to 25 USDC payouts in one tx, receipt URL.  
https://github.com/s21v1d9p/arcpayrun · https://arcpayrun.vercel.app  
`0xbC34A2aF65dF1a21316Eb23dC6023139906d5A20`  
https://explorer.arc.io/tx/0xc6a721b4541aad27bc28c6df4a34e916e7d58aa3b510f3e9373d8748ca9acb06

**5. Driplet** — https://dorahacks.io/buidl/49337  
USDC per second of a stream, split creator / co-host / agent. This is Onda and Versus on mainnet.  
https://github.com/Risingtell/driplet · https://trydriplet.vercel.app  
StreamRegistry `0x620cdedeecec27648ac10121e789135a07cda981`  
Deploy `0x07344ed923f6c4f4f85c92a5692a3e51d0f146a1e69169c56623f34106bcb620`

**6. Arc AgentPay** — https://dorahacks.io/buidl/49393  
Non-custodial settlement for humans and agents, receipt on Arc.  
https://github.com/enstest1/arc-agentpay · https://arc-agentpay.up.railway.app  
`0x708A2F51e5cCA86dAeE2318A05E961F552d6E408`  
Deploy `0x5378e274c3c501a5e3a790fa85463b7abb31ce7babb1ce197f03fe3cee3211e8`

**7. Arc-Stream** — https://dorahacks.io/buidl/49028  
Open a USDC channel, stream EIP-712 vouchers at 1–25 Hz, settle with `ecrecover`.  
https://moyu-dev16.github.io/arc-agent-bazaar/  
`0xDf726AEEf70e33ed7DBCECdbb4d9ea9638dc46FB`  
“Zero gas” is the stream, not the open or the settle.

**8. Mahshar** — https://dorahacks.io/buidl/49369  
x402 API market. Page says mainnet, 16 purchases, one live listing. That count is the differentiator. Repo not on the scrape.

**9. Arc Desk** — https://dorahacks.io/buidl/48794  
Pulse, native-vs-ERC-20 check, Memo guestbook.  
https://github.com/kutluhaneth46/arc-desk · https://kutluhaneth46.github.io/arc-desk/  
Memo tx https://explorer.arc.io/tx/0x5f363b78fb7040a443f43ce82be3221cdb5fd8a3403ffa9d2b2c3edd98bb34c3

---

## Payments and invoicing

Crowded. A receipt app without a batch tx loses to Payrun.

| Project | Page | Distinct claim |
|---|---|---|
| BothDoors | https://dorahacks.io/buidl/49389 | Reads ERC-20 and native sends, dedupes by hash. https://bothdoors.vercel.app/ No custom contract |
| LLX Settlement Proofs | https://dorahacks.io/buidl/49371 | Proof instead of a PDF |
| Arc Payrun | above | 25-wallet batch, tx linked |
| PayLink | https://dorahacks.io/buidl/49361 | EURC and USDC invoice, one signature, no backend |
| Procure | https://dorahacks.io/buidl/49354 | Invoice must match the PO or the contract refuses |
| PaidThrough | https://dorahacks.io/buidl/49349 | School or clinic bill, refund if the biller never collects |
| ArcReceipt | https://dorahacks.io/buidl/49345 | Finality, recipient check, export |
| ArcBatch | https://dorahacks.io/buidl/49335 | Non-custodial multi-pay. Overlaps Payrun |
| Snooper Bill | https://dorahacks.io/buidl/49326 | Human-proof payroll. Overlaps Payrun |
| Standing Orders | https://dorahacks.io/buidl/49310 | Standing order with a cap, about $0.001 a charge |
| ArcMirror | https://dorahacks.io/buidl/49292 | Trace flows, split gas from transfer, no wallet |
| Zela Pay | https://dorahacks.io/buidl/49259 | Embed accept and send |

Procure and PaidThrough are the only ones a non-crypto operator would describe without saying “batch.”

---

## Agents and x402

| Project | Page | Distinct claim |
|---|---|---|
| Arc AgentPay | above | Mainnet contract |
| Warrant | https://dorahacks.io/buidl/49385 | Trading limits, public audit, ERC-8004 |
| Mahshar | above | 16 purchases |
| Arc Spend Tracker | https://dorahacks.io/buidl/49339 | Policy plus an accounting export |
| AgentBadge | https://dorahacks.io/buidl/49304 | x402 plus ERC-8004 attestation |
| Lumexa AI Wallet | https://dorahacks.io/buidl/49302 | AI explains a balance. Weak Arc use |
| Fuci | https://dorahacks.io/buidl/49271 | Agent wallet plus a one-tx launchpad |
| AgentPay | https://dorahacks.io/buidl/49255 | External agent request, policy on the rail |
| Liquid Agent x402 | https://dorahacks.io/buidl/49242 | Pay per call and bridge in one signature |
| Resvary | https://dorahacks.io/buidl/49205 | Prepaid credits, duplicate-charge guard |
| Arc-Stream | above | State channel |
| HelpRent x402 | https://dorahacks.io/buidl/48799 | Was Base and Solana. Needs the Arc contract |
| Arc Market | above | Honesty layer over the registry |

Warrant and Spend Tracker match the lesson from earlier agent rooms: the model does not get to exceed a cap.

---

## Escrow and community finance

Closer to “worth taking further” than another batch sender.

| Project | Page | Idea |
|---|---|---|
| Potluck | https://dorahacks.io/buidl/49375 | Savings circle, collateral, open book, auction |
| Escrowai | https://dorahacks.io/buidl/49367 | Freelancer paid only after the employer confirms |
| pottle | https://dorahacks.io/buidl/49359 | One link, group-chat USDC, pay when the goal hits |
| ProofPay | https://dorahacks.io/buidl/49343 | Hold until a stranger deal clears |
| Roscacredit | https://dorahacks.io/buidl/49333 | ROSCA, automated USDC |
| Ajo | https://dorahacks.io/buidl/49318 | Ajo, esusu, susu. Members sign. They do not buy gas |
| Faza | https://dorahacks.io/buidl/49298 | Equal stake. Flake and you lose it |
| Ryntra Guard | https://dorahacks.io/buidl/49188 | Contractor payment checked against a record before sign |

Ajo is the sharpest Arc-native line in this cluster. Potluck and Roscacredit are the same product unless one has a circle that is not the author.

---

## DeFi and stablecoin tooling

| Project | Page | Note |
|---|---|---|
| Predarc | https://dorahacks.io/buidl/49391 | Predictions, bridge, swap, permissioned agents. Wide |
| Arc Smith | https://dorahacks.io/buidl/49373 | Readable Uniswap v4 hooks before you trade |
| Stabio Flow | https://dorahacks.io/buidl/49341 | Move, earn, swap, automate |
| Standing | https://dorahacks.io/buidl/49324 | Recurring USDC, no oracle, no keeper token, gas refunded in USDC |
| Mofu | https://dorahacks.io/buidl/49320 | Launch, swap, lend. Overlaps A NEW ONE |
| CredTrust Arc | https://dorahacks.io/buidl/49328 | On-chain credit reputation |
| flowfi.finance | https://dorahacks.io/buidl/49261 | Circle Gateway, gasless entry |
| Torus | https://dorahacks.io/buidl/49171 | Yield pays the gas. Needs the yield source on Arc |
| Lunex | https://dorahacks.io/buidl/41404 | USDC/EURC StableSwap and ERC-4626 vaults. **Contracts are testnet** (`0x181DA777…`, chain 5042002). Screen-out until a 5042 deploy |

Standing is the one that uses dollar gas as the mechanism. A NEW ONE already occupies “launch in USDC.”

---

## Infra, identity, media, games

| Project | Page | Note |
|---|---|---|
| PQ Release Log | https://dorahacks.io/buidl/49363 | SLH-DSA precompile. Arc-only if the verify tx is mainnet |
| Arc Fee Lens | https://dorahacks.io/buidl/49331 | Read-only 5042 gas |
| Pulse Arc Agent Radar | https://dorahacks.io/buidl/49285 | Watches ERC-8004 and x402. Overlaps Arc Market |
| Foskaay | https://dorahacks.io/buidl/49203 | Gasless game infra |
| Tevumi Bridge | https://dorahacks.io/buidl/49197 | BNB assets onto Arc. Needs a lock tx |
| Arc Rep | https://dorahacks.io/buidl/49183 | Wallet activity to a signal |
| Geomacro | https://dorahacks.io/buidl/49179 | Macro risk anchored on Arc |
| Berth Club | https://dorahacks.io/buidl/49175 | Agent launchpad. Overlaps A NEW ONE and Fuci |
| Genslopify | https://dorahacks.io/buidl/49172 | Pay per image. Explicitly in this program. Contract link is on the page, not expanded in scrape |
| ARCBANG | https://dorahacks.io/buidl/48991 | Block hash to a universe, dollar mint, no project token |
| Poppin | https://dorahacks.io/buidl/49300 | News reader with a USDC buy button |
| Stubby | https://dorahacks.io/buidl/49192 | Prize draw, USDC pot |
| Chase Dinosaurs | https://dorahacks.io/buidl/49167 | Ranked game, escrowed USDC, contract pays the pool |
| ArcLens | https://dorahacks.io/buidl/49161 | Plain-language guide |
| Wallet PR | https://dorahacks.io/buidl/48777 | Issues #2230 and #2228. A PR is not a deployment |
| NodeOps Monitor | https://dorahacks.io/buidl/49351 | **Portaldot testnet.** Out |
| LexAnchor | https://dorahacks.io/buidl/49186 | **ink! on Portaldot.** Not Arc mainnet. Out |

Not a buidl, but live on 5042 and useful as prior art: Arc Names registry `0x217C7850c9895F69d1A72C3bdffb15d063e2a56F`, controller `0x4c2794559BA42f4f116B2fD49b8aa27bA2fdB249`, docs https://www.arcnaming.xyz/docs/protocol/contracts.html

---

## How the 20 slots actually split

About 55 public Arc-tagged buidls. Twenty grants. The clusters that will eat each other:

- Batch payroll: Payrun, ArcBatch, Snooper Bill, Standing Orders, Standing. One slot unless a second has a real vendor list.  
- x402 agent pay: AgentPay, AgentBadge, Fuci, Liquid, Arc-Stream, Mahshar, HelpRent. Mahshar and Arc-Stream have the receipts.  
- Launchpads: A NEW ONE, Mofu, Fuci, Berth Club. A NEW ONE is ahead.  
- ROSCA: Potluck, Roscacredit, Ajo. One slot.  
- Read-only dashboards: Arc Desk, Arc Fee Lens, ArcLens, ArcMirror, Pulse. One slot, and Arc Market is the serious version.

Empty enough to still be a rational 500: a PO-matched invoice with a mainnet refusal (Procure), a bill that refunds (PaidThrough), a savings circle with a member who is not the author (Ajo), a post-quantum verify tx (PQ Release Log), a stream second that is not the author’s wallet (Driplet).

File on the microgrant page, not only as a buidl. Put the contract and one non-deploy tx in the first paragraph. If Circle already paid that deployment, it is ineligible. A testnet winner redeployed to 5042 with a new receipt is eligible.






**Indexing:** subscribe to `newHeads`, page `eth_getLogs` in ≤9,999-block chunks, take native USDC from the system `Transfer` emitter, order by `blockNumber` then `logIndex`, and skip reorg rollback for **committed** blocks. Docs treat BFT commit as irreversible; they do not remove pending/dropped txs, `status: 0` inclusions, RPC height skew, or operator node unwind.

**PQ vs wallets:** `SLH-DSA-SHA2-128s` **verification** is a precompile at `0x1800…0004`. Native PQ **wallet signing** is documented as future (likely EIP-8141). The `arc-node` README still says testnet; official docs and connect-to-arc say **mainnet 5042 is live**.

Firecrawl scrapes of the five required URLs failed (`Insufficient credits`). Those pages were fetched with WebFetch instead. GitHub HTML for `circlefin/arc-node` was nearly empty; **raw files worked**. GitHub code search for the log-range constant returned **401**.

---

## What the official docs actually say

Index: [https://docs.arc.io/llms.txt](https://docs.arc.io/llms.txt)

### [docs.arc.io](https://docs.arc.io/)
- USDC is gas, not ETH.
- Sub-second finality; no multi-confirmation wait.
- Osaka EVM; canonical runtime diffs: [evm-differences](https://docs.arc.io/arc/references/evm-differences).
- Homepage “What’s new”: **Sep 16 — Arc mainnet is live**.
- Linked: App Kits, connect-to-arc, contract addresses, MCP, `llms.txt`.

### [integrate](https://docs.arc.io/integrate/)
Three integration differences: USDC gas; deterministic finality (“no risk of reorganization. A single confirmation is sufficient”); dual USDC (native 18 / ERC-20 6, same balance). Indexer entry: [Index events](https://docs.arc.io/integrate/infrastructure/indexing-events).

### [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events)
Recommended architecture:
1. Live: `eth_subscribe("newHeads")` / WS `block`.
2. History: `eth_getLogs` with `fromBlock`/`toBlock`. Sample `BATCH_SIZE = 1000`.
3. Native USDC: emitter `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE`, `Transfer`, topic0 `0xddf252ad…`, **18 decimals**. Covers native sends, ERC-20 native leg, mint/burn. **Gas deductions emit no Transfer.**
4. Do not use `tx.from` for EIP-3009; use log `from`.
5. ERC-20 USDC `0x3600…0000` also emits **6-decimal** `Transfer`; filter by emitter or double-count.
6. Also index EURC, Memo (`0x5294…e505`, testnet as of 2026-06-18), USDC `Blocklisted`/`UnBlocklisted`, CCTP `DepositForBurn` / `MessageReceived`.
7. Order by **block number + logIndex**, not `block.timestamp` (sub-second blocks can share a second).
8. **Skip reorg/rollback/confirmation-depth/uncles.** Resume from last processed block.

Linked: [USDC system events](https://docs.arc.io/arc/references/usdc-system-events), [infrastructure](https://docs.arc.io/integrate/infrastructure), [deterministic-finality](https://docs.arc.io/arc/concepts/deterministic-finality).

### [deterministic-finality](https://docs.arc.io/arc/concepts/deterministic-finality)
Pending or final only. Malachite BFT: **>2/3 validator signatures → irreversible**. “No confirmation windows, no reorganization risk.” Consensus detail: [consensus-layer](https://docs.arc.io/arc/concepts/consensus-layer) (propose / pre-vote / pre-commit / commit; PoA).

**Does that remove reorg rollback?** For **committed** blocks, docs say yes: do not keep Ethereum-style reorg recovery. It does **not** mean: mempool is final; a `status: 0` tx didn’t happen; public RPC can’t return `-32014` across backends; a node operator cannot locally `db rollback` ([CHANGELOG v0.7.0](https://github.com/circlefin/arc-node/blob/main/CHANGELOG.md)). Safety is the usual BFT bound: **&lt;1/3 faulty validators**.

### [evm-differences](https://docs.arc.io/arc/references/evm-differences)
USDC native gas; dual decimals; `PREVRANDAO` = 0; no blobs; empty withdrawals; `address(0)` value sends revert; forbidden burns; blocklist reverts consume gas; EIP-7708 system `Transfer`; **20 Gwei `maxFeePerGas` floor** (silent mempool drop); timestamps non-decreasing; final on inclusion.

### Also linked and read
- [post-quantum-security](https://docs.arc.io/arc/concepts/post-quantum-security): verification live; **native wallet signing future**.
- [execution-layer](https://docs.arc.io/arc/concepts/execution-layer): five `0x1800…` precompiles; PQ at `…0004`.
- [rpc-endpoints](https://docs.arc.io/arc/references/rpc-endpoints): `eth_getLogs` **10,000-block** public limit, error **`-32012`**; page **≤9,999**. Load-balanced head: **`-32014`**, retry.
- [gas-and-fees](https://docs.arc.io/arc/references/gas-and-fees): USDC 18-decimal gas; 20 Gwei min (page labels **testnet**); **“may change before mainnet launch.”**
- [connect-to-arc](https://docs.arc.io/arc/references/connect-to-arc): mainnet **5042** `https://rpc.mainnet.arc.io`; testnet **5042002**.
- [arc-chain](https://docs.arc.io/arc-chain): table still lists **Chain ID 5042002** and “~0.48 s (testnet)” as *the* network details.
- [transaction-lifecycle](https://docs.arc.io/integrate/wallets/transaction-lifecycle): pending vs final; dropped underpriced txs leave no receipt.

---

## `circlefin/arc-node` (source, not README marketing)

| Item | Source | Fact |
|---|---|---|
| PQ interface | [`contracts/src/pq/IPQ.sol`](https://github.com/circlefin/arc-node/blob/main/contracts/src/pq/IPQ.sol) | `verifySlhDsaSha2128s(vk, message, sig)`; vk **32 B**, sig **7856 B**; gas **230,000 + 6/word** of message; “experimental”; “do not solely rely… pair with classical signatures.” |
| Address | [`contracts/src/Precompiles.sol`](https://github.com/circlefin/arc-node/blob/main/contracts/src/Precompiles.sol), [`docs/ARCHITECTURE.md`](https://github.com/circlefin/arc-node/blob/main/docs/ARCHITECTURE.md) | `PQ = 0x1800000000000000000000000000000000000004` |
| Runtime | [`crates/precompiles/src/pq.rs`](https://github.com/circlefin/arc-node/blob/main/crates/precompiles/src/pq.rs) | Delegates to `arc_pq_precompile`; unit tests gate on **Zero6**; malformed vk/sig lengths fail; invalid sig returns `false` (does not revert). |
| USDC gas | README + docs | Native USDC; ERC-20 at `0x3600…` is a linked 6-decimal view. |
| RPC limits verified in **docs / CHANGELOG**, not in a `getLogs` constant this pass | [rpc-endpoints](https://docs.arc.io/arc/references/rpc-endpoints), [CHANGELOG](https://github.com/circlefin/arc-node/blob/main/CHANGELOG.md) | Public logs: 10k blocks / `-32012`. Node defaults: `eth_call` gascap **30M**; JSON-RPC batch **100**; max connections **250**; WS subs/connection **32**; pending txs **hidden by default**; unprotected txs rejected. GitHub code search for the 10k constant: **401**. |
| Network status | [README](https://raw.githubusercontent.com/circlefin/arc-node/master/README.md) vs [docs.arc.io](https://docs.arc.io/) | README: **“currently in testnet”**, alpha, audits. Docs: **mainnet live**, chain **5042**. **Trust the docs for status.** |

Other README vs docs: README privacy is “coming soon”; docs APS is **planned**. README does not mention the PQ precompile; ARCHITECTURE.md and IPQ do.

---

## Competitor audit (onchain vs UI)

Baseline product: **PQ root + Barkeep tab** (SLH-DSA root holds treasury; agent spends only inside an immutable tab).

### MergePay — [codeswithroh/mergepay](https://github.com/codeswithroh/mergepay)
- **Code:** escrow USDC; `award` checks GitHub OIDC **RS256** on-chain (`modexp`); binds `iss`/`aud`/`repository_id`/pinned `job_workflow_ref`; wallet link via owner-repo token.
- **UI only:** GitHub OAuth dashboard, activity feed (README: events, not an editable DB).
- **Trust:** GitHub JWKS; **maintainer merge**; pinned workflow YAML in the repo; 3-day key delay.
- **Attacker:** merge a self-dealing PR; capture maintainer workflow; forged JWT should fail RSA (README: 30 Foundry tests). Relayer cannot redirect payee.
- **User:** fund issue; contributor `/claim`, PR `Fixes #N`, link wallet.
- **Better than PQ+tab:** merge-gated payout, no agent budget product.
- **Weaker:** no PQ; bounty not a spend capability; GitHub is the root of trust.

### arc-guard — [Jayanthkoppala/arc-guard](https://github.com/Jayanthkoppala/arc-guard) · [`ArcGuard.sol`](https://raw.githubusercontent.com/Jayanthkoppala/arc-guard/main/src/ArcGuard.sol)
- **Code:** one box/wallet; `withdraw`/`rotateKey` need wallet **and** SLH-DSA via `…0004`; `cancelExit` is PQ-relayable; `deposit`/`moveToSavings` wallet-only; `requestExit` wallet-only, **7 days**, then `executeExit` pays only `exitTo`.
- **UI:** key generated in-browser (`@noble/post-quantum`).
- **Trust:** unaudited; Morpho/Galaxy vault risk; browser key storage.
- **Attacker:** both keys empty the box; wallet-only starts 7-day drain unless PQ cancels; no agent path.
- **User:** open box, deposit, two-key withdraw or wait out exit.
- **Better:** personal PQ vault + recovery without Barkeep.
- **Weaker:** no delegation/tabs; classical wallet can still *start* exit.

### Barkeep — [barbarosalagoz/barkeep-arc](https://github.com/barbarosalagoz/barkeep-arc)
- **Code:** clone funded with **exact cap**; ERC-1271 over EIP-3009; payees / maxPerCall / expiry **immutable in bytecode**; `close()` owner-only.
- **UI/MCP:** agent keys on MCP; owner CLI is a **separate process** (not OS isolation).
- **Trust:** unaudited; Circle facilitator for x402; **owner EOA is the treasury**.
- **Attacker:** stolen agent key spends remaining tab (payee/max/expiry/cap); stolen owner key drains treasury / opens tabs; donations to a tab are spendable.
- **User:** owner opens/funds/closes; agent `pay_and_fetch`.
- **Better:** x402/3009 agent rail, proven refusals.
- **Weaker:** classical owner key — the gap a PQ root closes.

### Pigeonhole — [edycutjong/pigeonhole](https://github.com/edycutjong/pigeonhole)
- **Code:** CREATE2 address, no key; `sweep` deploys constructor `SELFDESTRUCT` to **immutable treasury** (Arc-only: native USDC + EIP-6780).
- **UI:** static page; PAID/SWEPT from system-emitter logs; **no DB**.
- **Trust:** public RPC; treasury blocklist is a freeze; `?amt=` is a claim.
- **Attacker:** cannot redirect sweep; can grief unpaid addresses; RPC/log-cap can show false UNPAID if unchunked (they chunk 9,000).
- **User:** share invoice URL; anyone may sweep.
- **Better:** keyless deposits, log-native ledger.
- **Weaker:** not agent spend control; no PQ.

### Legwork — [edycutjong/legwork](https://github.com/edycutjong/legwork)
- **Code:** `execute` pays payee, meters gas, refunds `min(gasprice, 2×basefee, max) + tip` from same USDC deposit; `Underfunded` reverts whole; refusing payee pauses.
- **UI:** static page from `eth_call` / logs / receipts.
- **Trust:** executors must show up (tip ≥ cost); payee 30k stipend.
- **Attacker:** grief paused orders; cannot take deposit except as payee/executor per formula.
- **User:** create order; anyone executes.
- **Better:** keeper-less recurring USDC.
- **Weaker:** ECDSA payer; no PQ/tab policy.

### A-Identity — [getA-Identity/A-Identity](https://github.com/getA-Identity/A-Identity) · [`AgentSpendPolicy.sol`](https://raw.githubusercontent.com/getA-Identity/A-Identity/main/mcp/contracts/AgentSpendPolicy.sol)
- **Code:** vault `pay()` enforces freeze, session expiry, allowlist, per-tx ceiling, UTC daily cap; **owner** sets policy/`ownerPay`/`withdraw`; **operator is an ECDSA session key** (README: often server signer).
- **UI/server:** KYA, trust oracle, MCP hire/release, x402 — **not** the vault.
- **Trust:** owner EOA; operator EOA; server pre-check; ERC-8183 evaluator trust on non-verified jobs.
- **Attacker:** stolen operator spends inside policy; stolen owner takes all; over-limit `pay` reverts.
- **User:** register identity, fund vault, set caps.
- **Better:** marketplace + on-chain daily cap.
- **Weaker:** no SLH-DSA; operator/owner are classical; much product is off-chain.

### A NEW ONE — [izzetcakmak/anewone](https://github.com/izzetcakmak/anewone)
- **Code:** USDC bonding curve, 1.5% fee, 2%/20-block anti-snipe, graduate 5k USDC into locked Uni v3; **admin** (deployer) adds/removes owners, opens migrations.
- **UI:** launchpad, Deck Hand, x402 API paywall (`CIRCLE_API_KEY` / seller key).
- **Trust:** admin; RPC/chat serverless; memecoin + RWA **interface** (README: never issues/custodies).
- **Attacker:** multi-wallet snipe (they admit 2% is per-wallet); admin surface.
- **User:** launch/trade from a wallet.
- **Better:** live launchpad/AMM, not a spend-root.
- **Weaker:** unrelated threat model; admin; no PQ.

### BountyAgent — [I-frenzy/bountyagent](https://github.com/I-frenzy/bountyagent)
- **Code:** verified path: commit-reveal → `STATICCALL` verifier → atomic USDC + ERC-8004 write; curated path: poster picks winners; deadlines; no upgrade (README: `owner()` identity only).
- **UI:** board, MCP read-only, worker.
- **Trust:** verifier quality; poster-decided bounties; reputation wash-trade (they document this).
- **Attacker:** copy answers after reveal (commit-reveal + first-payout block cut); cannot steal escrow without verifier/poster path.
- **User:** post USDC, solve or curate.
- **Better:** trust-minimized “easy to verify” work.
- **Weaker:** not a PQ treasury / tab.

### PQ Release Log — [wayfold-labs/pq-release-log](https://github.com/wayfold-labs/pq-release-log)
- **Code:** SLH-DSA required to `registerProject`/`publish`; EOA submits tx; no revoke/rotation; **moves no value**.
- **UI:** wallet-free verifier; CLI is the anti-compromised-host control.
- **Trust:** RPC; unlisted files; user must actually check.
- **Attacker:** need **both** EOA and PQ key; cannot steal USDC from this contract.
- **User:** keygen, register-plan, publish-plan, `verify-site`.
- **Better:** PQ over **artifacts**, not money.
- **Weaker:** no spend policy.

### Arc AgentPay — [enstest1/arc-agentpay](https://github.com/enstest1/arc-agentpay)
- **Code:** `transferFrom` payer→recipient; `PaymentSettled`; duplicate `paymentId` rejected; no custody (README).
- **UI/API:** `POST /api/pay-intent` returns calldata; **server holds no keys**; suggested agent limits are **off-chain**.
- **Trust:** whoever signs; allowance; experimental. README checklist: **&lt;3 real settlements** still open.
- **Attacker:** stolen agent key pays any recipient unless the agent process enforces allowlists.
- **User:** approve USDC, sign settle.
- **Better:** receipt UX for agents.
- **Weaker:** no on-chain cap/payee/PQ; policy is a comment.

### Arc Payrun — [s21v1d9p/arcpayrun](https://github.com/s21v1d9p/arcpayrun)
- **Code:** `pay(recipients, amounts)` native USDC; `msg.value == sum`; all-or-nothing; no owner/upgrade/withdraw; bytecode pin in the app.
- **UI:** CSV, 25-recipient cap, receipt `?tx=`; `/arc-rpc` proxy; Safe App.
- **Trust:** payer key (or Safe); amounts public.
- **Attacker:** cannot drain contract; blocklisted/rejecting payee reverts **whole batch**.
- **User:** paste list, one signature.
- **Better:** batch payroll receipt.
- **Weaker:** no agent bounds, no PQ.  
  Note: [Miss-shelby/PayRun](https://github.com/Miss-shelby/PayRun) README is a **create-next-app stub**, not this product.

### Arc-Stream — [Moyu-Dev16/arc-agent-bazaar](https://github.com/Moyu-Dev16/arc-agent-bazaar) · [`ArcAgentBazaar.sol`](https://raw.githubusercontent.com/Moyu-Dev16/arc-agent-bazaar/main/contracts/ArcAgentBazaar.sol)
- **Code:** `openChannel` escrow `msg.value`; provider `claimStreamingPayment` with **EIP-712 + `ecrecover`**; cooperative close; timeout refund to buyer; stall registry is a **handle/rate listing**.
- **UI:** “zero gas” is **vouchers**, not open/settle. README `closeChannel` name **does not match** the Solidity (`claimStreamingPayment` / `closeChannelCooperative`). Demo print uses anvil-looking addresses; **no deployments table in README**.
- **Trust:** ECDSA buyer key for every voucher; provider liveness; `receive()` accepts untracked USDC.
- **Attacker:** stolen buyer key signs larger cumulative claims up to deposit; cannot exceed deposit.
- **User:** open channel, stream sigs, settle.
- **Better:** high-Hz micropay without a tx per beat.
- **Weaker:** secp256k1, not SLH-DSA; not a Barkeep-style payee/max/expiry tab.  
  [ygd58/arc-stream](https://github.com/ygd58/arc-stream) is a **different** testnet “pay every N ms on-chain” script.

### Arc Market / PoolLens — [babaanalytix-commits/baba-lens](https://github.com/babaanalytix-commits/baba-lens)
- **Code:** view-only `PoolLens` at `0xADebbd5825B033bCD4B84FB019AbFC673406d902` (same address Arc/Base/HyperEVM/Robinhood); **STATICCALL only**; `NO_DATA` instead of fake zeros; no keys/funds/owner.
- **UI:** any directory (e.g. babacapital.app) is **not** this contract. I did **not** fetch that site this pass — do not treat directory stats as verified.
- **Trust:** RPC honesty; lens cannot steal.
- **Attacker:** nothing to drain; can still lie at the HTTP directory layer.
- **User:** `eth_call` `poolState` / `position`.
- **Better:** honest CL-pool reads for agents.
- **Weaker:** no payments, no PQ spend root.

---

## Source ledger (portfolio indexer)

| Fact | URL / path | Implication |
|---|---|---|
| Index native USDC from `0xffff…fffe` `Transfer` (18 dec) | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events), [usdc-system-events](https://docs.arc.io/arc/references/usdc-system-events) | One stream for native+ERC-20 leg; ignore ERC-20 emitter or you double-count. |
| Gas/rewards are not `Transfer`s | same | Fee history = `gasUsed × effectiveGasPrice` and `block.miner`, not logs. |
| ERC-20 `transfer()` emits two logs | same | Dedupe by emitter; never mix 6- and 18-decimal amounts. |
| Pre-Zero5 testnet used `NativeCoin*` at `0x1800…0000` | [usdc-system-events](https://docs.arc.io/arc/references/usdc-system-events) | Mainnet genesis is EIP-7708 only; testnet backfill must switch event sets at activation. |
| Live: `newHeads`; history: paged `eth_getLogs` | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events) | Pipeline must ingest many blocks/sec; sample batch is 1,000. |
| Public `eth_getLogs` max 10,000 blocks, `-32012` | [rpc-endpoints](https://docs.arc.io/arc/references/rpc-endpoints) | Page ≤9,999 (~85 min at ~2 blk/s). **Not re-verified in arc-node source this session.** |
| Load-balanced RPC `-32014` near head | [rpc-endpoints](https://docs.arc.io/arc/references/rpc-endpoints) | Don’t treat `eth_blockNumber` + immediate `getLogs(toBlock=that)` as atomic. |
| Order by blockNumber, logIndex | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events), [evm-differences](https://docs.arc.io/arc/references/evm-differences) | Timestamp is not unique. |
| Docs: skip reorg rollback after commit | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events), [deterministic-finality](https://docs.arc.io/arc/concepts/deterministic-finality), [consensus-layer](https://docs.arc.io/arc/concepts/consensus-layer) | Index each committed block once; resume by height. Still handle pending/drop/`status:0`. |
| CL `db rollback` exists | [CHANGELOG v0.7.0](https://github.com/circlefin/arc-node/blob/main/CHANGELOG.md) | Operator unwind ≠ consensus reorg; don’t confuse the two. |
| Pending hidden by default on nodes | CHANGELOG v0.7.0 | Public indexer may never see mempool. |
| EIP-3009: `tx.from` is the relayer | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events), [infrastructure](https://docs.arc.io/integrate/infrastructure) | Attribute sender from system `Transfer.from`. |
| Blocklist revert is included, `status: 0` | [evm-differences](https://docs.arc.io/arc/references/evm-differences), [transaction-lifecycle](https://docs.arc.io/integrate/wallets/transaction-lifecycle) | Don’t credit failed transfers; nonce is spent. |
| Dual USDC 18/6, same balance | [evm-differences](https://docs.arc.io/arc/references/evm-differences), [gas-and-fees](https://docs.arc.io/arc/references/gas-and-fees) | `eth_getBalance` is 18-dec USDC; `balanceOf` 6-dec can be 0 with dust left. |
| 20 Gwei floor | [evm-differences](https://docs.arc.io/arc/references/evm-differences) | Underpriced txs vanish with no receipt. |
| Mainnet 5042 / testnet 5042002 | [connect-to-arc](https://docs.arc.io/arc/references/connect-to-arc) | Don’t use [arc-chain](https://docs.arc.io/arc-chain) table (lists 5042002 as “the” chain ID). |
| README “testnet” vs docs mainnet | [arc-node README](https://raw.githubusercontent.com/circlefin/arc-node/master/README.md) vs [docs.arc.io](https://docs.arc.io/) | Stale README; docs win for network status. |
| gas-and-fees “before mainnet launch” | [gas-and-fees](https://docs.arc.io/arc/references/gas-and-fees) | Stale footer; re-check params vs mainnet. |
| PQ verify precompile live; wallet signing not | [IPQ.sol](https://github.com/circlefin/arc-node/blob/main/contracts/src/pq/IPQ.sol), [post-quantum-security](https://docs.arc.io/arc/concepts/post-quantum-security) vs [arc-chain](https://docs.arc.io/arc-chain) “wallet signatures protect accounts” | Index `PQVerified`-style app events if you care about PQ auth; do not assume txs are SLH-DSA-signed. |
| PQ gas ~230k + calldata | IPQ.sol, pq.rs tests | A PQ verify tx is a large log/calldata object (~7.8kB sig). |
| Memo / CCTP / blocklist addresses | [indexing-events](https://docs.arc.io/integrate/infrastructure/indexing-events) | Separate contracts; Memo date is **testnet June 18, 2026** — confirm mainnet address before indexing. |
| Pigeonhole: 9,999 ok / 10,000 `-32012`; burst `-32005` | [DEV post](https://dev.to/edycutjong/a-usdc-deposit-address-with-no-private-key-and-the-9999-block-rpc-cap-that-almost-froze-it-el6), pigeonhole README | Official docs mention `-32012` not `-32005`; pace `getLogs` anyway. |
| Barkeep tab spend is ERC-1271 + 3009 | [barkeep-arc README](https://github.com/barbarosalagoz/barkeep-arc) | Index USDC `transferWithAuthorization` + tab `isValidSignature` failures, not only `Transfer`. |
| Arc-Stream settle is `ecrecover` | `ArcAgentBazaar.sol` | Vouchers are off-chain; indexer only sees open/claim/close txs. |

**Failed this pass:** Firecrawl (credits); GitHub code search 401; `circlefin/arc-node` HTML page unusable (raw OK). **Not fabricated:** no extra GitHub for “Arc Market” beyond PoolLens (`baba-lens`).

Date checked for every fact below: **2026-10-08**. Status: **VERIFIED** = page was fetched this session; **DOCUMENTED** = that page states the fact; **UNKNOWN** = could not read it. No secrets are included.

---

## 1. Chain id, RPC, explorer

| Network | Chain ID | Primary HTTP RPC | Explorer |
|---|---|---|---|
| Mainnet | `5042` | `https://rpc.mainnet.arc.io` | `https://explorer.arc.io` |
| Testnet | `5042002` | `https://rpc.testnet.arc.io` | `https://explorer.testnet.arc.io` |

- **Source:** https://docs.arc.io/arc/references/connect-to-arc — **VERIFIED**. Quote: “Chain ID `5042` … New RPC URL `https://rpc.mainnet.arc.io` … Explorer URL `https://explorer.arc.io`.”
- **Source:** https://docs.arc.io/arc/references/rpc-endpoints — **VERIFIED**. Same chain ids; primary WebSocket `wss://rpc.mainnet.arc.io`.
- **Source:** https://docs.arc.io/ — **VERIFIED**. “Sep 16 Arc mainnet is live.”
- **Conflict (docs win):** https://github.com/circlefin/arc-node README (raw `master`) still says “Arc is currently in testnet, and this is alpha software.” — **VERIFIED** fetch; treat as stale vs docs.

---

## 2. Indexing recommendations

**newHeads**
- Use `eth_subscribe("newHeads")` over WebSocket for real-time blocks; `eth_getLogs` with `fromBlock`/`toBlock` for backfill.
- **Source:** https://docs.arc.io/integrate/infrastructure/indexing-events — **VERIFIED**. Quote: “Use `eth_subscribe(\"newHeads\")` over WebSocket for real-time block notifications. For historical back-fills, use `eth_getLogs` with `fromBlock`/`toBlock` ranges.”
- Sample code on that page uses **testnet** `wss://rpc.testnet.arc.io` / `https://rpc.testnet.arc.io`. Mainnet sockets are on the RPC page above.

**eth_getLogs limits**
- Public endpoint block-range limit: **10,000 blocks**. Over that: error **`-32012`**. Page in **≤9,999-block** chunks. At ~2 blocks/s, 10,000 blocks ≈ 85 minutes.
- **Source:** https://docs.arc.io/arc/references/rpc-endpoints — **VERIFIED**. Quote: “`eth_getLogs` … Block range limit: 10,000 blocks” and “`eth_getLogs` returns error `-32012` when the requested block range exceeds 10,000 blocks. … Log-driven clients must page through history in ≤9,999-block chunks.”
- Indexing how-to sample uses `BATCH_SIZE = 1000` as example code only, not a stated RPC cap. **Source:** indexing-events — **VERIFIED**.
- Near-head `-32014` from load-balanced backends: retry after backoff. **Source:** rpc-endpoints — **VERIFIED**.

**Finality**
- Deterministic: a committed block is irreversible; skip reorg/confirmation-depth logic.
- **Source:** https://docs.arc.io/arc/concepts/deterministic-finality — **VERIFIED**. Quote: “every transaction is either unconfirmed or final, with no intermediate state. … once more than two-thirds of validators sign off on a block, that block is irreversible.” Table: “Arc | &lt;1 s | Deterministic. Final on commit.”
- **Source:** indexing-events — **VERIFIED**. Quote: “Skip reorg-handling logic entirely; Arc's deterministic finality means every block is permanent.” “This block is final—it will never be reverted.”

**Ordering**
- Canonical key: `blockNumber`, then `logIndex`. Do not order by `block.timestamp` (sub-second blocks can share a timestamp).
- **Source:** indexing-events — **VERIFIED**. Quote: “Always use `blockNumber` (and `logIndex` in a block) as your canonical ordering key.” “Do not use `block.timestamp` for ordering.”
- **Source:** https://docs.arc.io/arc/references/evm-differences — **VERIFIED**. Quote: “Use the block number for ordering, and don't assume `block.timestamp` strictly increases between blocks.”

**Indexing-page vs contract-addresses (mainnet):** indexing-events event-reference CCTP/EURC addresses match **testnet** on contract-addresses (`TokenMessengerV2` `0x8FE6…2DAA`, EURC `0x89B5…D72a`). Mainnet CCTP/EURC differ (`TokenMessengerV2` `0x28b5…cf5d`, EURC `0xbEf5…21c1`). **Docs win for mainnet: use contract-addresses.** Memo `0x5294…e505` is listed on both networks.

---

## 3. Event-truth draft: native USDC Transfer vs ERC-20 USDC Transfer

### Emitters and decimals

| Stream | Emitter | Decimals |
|---|---|---|
| Native system EIP-7708 `Transfer` | `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` | 18 |
| ERC-20 NativeFiatToken `Transfer` | `0x3600000000000000000000000000000000000000` | 6 |

**Quotes (all VERIFIED fetches):**

From https://docs.arc.io/arc/references/usdc-system-events:
- “The native system emitter logs a `Transfer` for every explicit USDC transfer—native sends, ERC-20 transfers, mints, and burns—at 18-decimal precision. The ERC-20 USDC contract logs its own 6-decimal `Transfer` for ERC-20 interface calls only.”
- “A single ERC-20 `transfer()` emits two logs: the ERC-20 contract's own `Transfer` (6 decimals, from `0x3600000000000000000000000000000000000000`) and the native system `Transfer` (18 decimals, from `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE`). A plain native send emits only the system log. Match on the emitter address so you do not count the same movement twice, and never mix the 6-decimal and 18-decimal values.”

From https://docs.arc.io/integrate/infrastructure/indexing-events:
- “Every explicit USDC transfer emits a standard ERC-20 `Transfer` log from the system address `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` … with values in 18 decimals.”
- “The ERC-20 USDC contract at `0x3600…0000` also emits its own `Transfer` (6 decimals) for ERC-20-interface activity, so an ERC-20 `transfer()` produces a log from both emitters. Distinguish them by emitter address and never count the same movement twice.”

From https://docs.arc.io/arc/references/evm-differences:
- “USDC on Arc has two interfaces that share one balance: a native interface (18 decimals) and an ERC-20 interface (6 decimals) … To display a native value as USDC, divide by 10¹².”

From https://docs.arc.io/arc/references/contract-addresses:
- “On Arc, the native USDC gas token uses 18 decimals of precision, while the USDC ERC-20 interface uses 6 decimals.”

### Gas does not emit Transfer

- usdc-system-events: “Gas fees and block rewards are not emitted as `Transfer` events … Gas fees are derived from the receipt (`gasUsed × effectiveGasPrice`).”
- indexing-events: “Gas deductions don't emit Transfer events.”
- evm-differences: “Gas deductions don't emit a log; derive gas cost from the transaction receipt.”

### EIP-3009 sender: `tx.from` is **not** the payer

- indexing-events: “The `from` field in this log is the actual token sender. For EIP-3009 relayer transactions, `tx.from` is the relayer's address. Indexing it instead of the Transfer event's `from` records the wrong sender.”

### Double-count warning

- indexing-events: “If you also index the ERC-20 USDC contract (`0x3600…0000`) for its 6-decimal `Transfer` events, match on the emitter address so you do not count ERC-20 transfers twice.”
- evm-differences (indexers section title): “Indexing EIP-7708 Transfer events and avoiding double-counting from two emitter addresses.”

### Extra native-log rules (usdc-system-events)

- Native `Transfer` is emitted first in the transaction.
- Zero-value and self-transfers (`from == to`) emit no log.
- Mint/burn: `Transfer(0x0, recipient)` / `Transfer(from, 0x0)` via precompile only.
- Pre-Zero5 **testnet** history used `NativeCoin*` from `0x1800…0000`; “Mainnet has used the EIP-7708 `Transfer` log since genesis.”

---

## 4. SLH-DSA precompile address

**Address:** `0x1800000000000000000000000000000000000004`  
**Name:** PQ Signature Verify  
**Algorithm:** `SLH-DSA-SHA2-128s`

- **Source:** https://docs.arc.io/arc/concepts/execution-layer — **VERIFIED**. Table: “PQ Signature Verify | `0x1800..0004` | Post-quantum `SLH-DSA-SHA2-128s` signature verification.” Range stated as `0x1800000000000000000000000000000000000000` through `…0004`.
- **Source:** https://docs.arc.io/arc/concepts/post-quantum-security — **VERIFIED**. “`SLH-DSA-SHA2-128s` signature verification is live on Arc mainnet.” “Post-quantum transaction signing is a future milestone.” Native wallet signing is **not** live.
- **Source:** https://raw.githubusercontent.com/circlefin/arc-node/master/contracts/src/pq/IPQ.sol — **VERIFIED**. Interface `verifySlhDsaSha2128s(bytes vk, bytes message, bytes sig)`; vk 32 bytes, sig 7856 bytes; FIPS 205. **No address in this file.** Comment: “we recommend not to solely rely on them for authentication, but pair them with classical signatures.”
- GitHub HTML code search for the hex address in `circlefin/arc-node` returned no files — **UNKNOWN** for an address constant inside that repo’s searchable tree (docs still document it).

---

## 5. ERC-8004 on Arc mainnet

**Arc docs list mainnet registry addresses** (fetched):

| Contract | Mainnet address |
|---|---|
| IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| ValidationRegistry | `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` |

- **Source:** https://docs.arc.io/arc/references/contract-addresses — **VERIFIED**. Section “ERC-8004” under “Mainnet”.
- **Source:** https://docs.arc.io/arc/tutorials/register-your-first-ai-agent — **VERIFIED**. Walkthrough is **Arc Testnet**; it points to contract-addresses for registry addresses.
- **Source:** https://eips.ethereum.org/EIPS/eip-8004 — **VERIFIED**. Spec; payments orthogonal; no Arc deployment table.
- **Source:** https://github.com/erc-8004/erc-8004-contracts README — **VERIFIED**. Lists many chains (Ethereum, Base, Arbitrum, …) with the same CREATE2-style Identity/Reputation addresses; **Arc is not named**. Ends “More chains coming soon…”
- **Source:** https://github.com/erc-8004/best-practices README — **VERIFIED**. Index of Registration.md / Reputation.md / spec; **no Arc deployment statement**.
- On-chain bytecode at those Arc addresses this session: **UNKNOWN** (no `eth_getCode` run here). Circle’s address page is the official claim that they are deployed on Arc mainnet.

---

## 6. x402 V2 flow; batch settlement

**Required single-payment sequence (V2 headers):**

1. Client HTTP request (no payment).
2. Server `402` with `PAYMENT-REQUIRED` (and payment details).
3. Client retries with `PAYMENT-SIGNATURE` (Base64 `PaymentPayload`).
4. Server verifies (locally or facilitator).
5. Server settles.
6. Server returns the resource (or error) plus `PAYMENT-RESPONSE`.

- **Source:** https://docs.x402.org/core-concepts/client-server — **VERIFIED**. Six-step “Communication Flow”; client retries with `PAYMENT-SIGNATURE`.
- **Source:** https://docs.x402.org/core-concepts/http-402 — **VERIFIED**. Headers `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`. Quote: “Whether funds move onchain in the same HTTP round trip depends on the scheme: `exact` and `upto` typically settle immediately, while `batch-settlement` confirms the payment authorization up front and redeems value onchain later…”
- **Source:** https://x402.org/ — **VERIFIED**. “If a request arrives without payment, the server responds with HTTP 402, prompting the client to pay and retry.”
- **Source:** https://x402.org/x402-v2-launch/ — **VERIFIED**. V2 moves payment data to headers; SDKs backward-compatible with V1. Page “Last updated: 2026-06-24”.
- **Source:** https://x402.org/x402-an-open-standard-for-internet-native-payments/ — **VERIFIED**. High-level 402/USDC description only.

**Batch settlement is not required for a single payment.** It is a separate high-volume scheme (escrow + vouchers + bulk redeem). Exact/upto cover discrete transfers.

- **Source:** https://x402.org/x402-batch-settlement/ — **VERIFIED**. Quote: “While the exact and ‘up to’ schemes cover immediate, discrete transfers, batch settlement provides the economic rails for … high-density agentic markets.”
- **Source:** https://docs.x402.org/llms.txt — **VERIFIED**. Lists Exact, Upto, and Batch Settlement as separate schemes.

---

## 7. Competitors (repos fetched)

Pinned Barkeep (context, not a competitor): https://github.com/barbarosalagoz/barkeep-arc commit **`60f4b6082ec6bf88d2283201ea1e9e5f0f760901`** (2026-09-25). Factory `0xccebc58dd1f5937b36d5f9f89f0754424f4d443c`, implementation `0x89B63f2E43dea9014750925C01996D34856B01D2`. Owner = `msg.sender` of `openTab`, immutable in clone args. ERC-1271 `isValidSignature` over a 213-byte blob wrapping EIP-3009 `TransferWithAuthorization`; x402 `exact` + USDC EIP-3009 via facilitator. **Sources:** README, `docs/MAINNET.md`, `Tab.sol`, `TabFactory.sol` at that commit — **VERIFIED**.

| Project | Mechanism (one sentence) | SLH-DSA under funds | Uses Barkeep | Copy-cost |
|---|---|---|---|---|
| **arc-guard** https://github.com/Jayanthkoppala/arc-guard | Two-key USDC box: wallet tx + on-chain `SLH-DSA-SHA2-128s` key-card verify at `0x1800…0004` for withdraw/rotate/cancel-exit; 7-day wallet-only emergency exit. | **Yes** (withdrawals). README — **VERIFIED**. | **No** (not mentioned). | MIT; one `ArcGuard.sol`. PQ withdraw is copyable; it is a vault, not a per-agent tab. |
| **MergePay** https://github.com/codeswithroh/mergepay | Escrow USDC on a GitHub issue; on merge, contract verifies GitHub OIDC RS256 and pays the author. | **No** (RSA/`modexp`, not SLH-DSA). README — **VERIFIED**. | **No**. | MIT. Different problem (GitHub bounty); RSA verify is not a PQ root. |
| **A-Identity** https://github.com/getA-Identity/A-Identity | Agent passport/marketplace: ERC-8004 identity + spend-policy vault + x402/ERC-8183 escrow on Arc. | **Not stated** in the fetched README product description (ERC-8004 / vault / x402). Full 970-line search in this environment was unreliable; treat SLH-DSA-under-funds as **UNKNOWN** beyond “not described in the opening README.” | **Not stated** in that README. | MIT; large identity/marketplace surface, not a Barkeep tab. |
| **Legwork** https://github.com/edycutjong/legwork | Standing native-USDC orders; anyone `execute`s and is repaid metered gas + tip in the same USDC in the same tx. | **No** (not mentioned). README — **VERIFIED**. | **No**. | MIT; keeper-refund primitive, not agent spend policy. |

---

## 8. DoraHacks current Arc submissions

Hackathon page exists: **Arc Microgrants**, 20 × 500 USDC, submissions close **October 14, 2026**, mainnet required.

- **Source:** https://dorahacks.io/hackathon/arc-microgrants/detail — **VERIFIED**.
- **BUIDL list:** https://dorahacks.io/hackathon/arc-microgrants/buidl — **VERIFIED**. Page text: **“There are no Builds for this hackathon.”**
- Therefore **current named submissions: none on that listing** (do not take names from other repos). If the page is a JS empty shell, a live browser list is **UNKNOWN**.
- Legwork README badges point at `dorahacks.io/buidl/49025`; that is **not** a listing I found on the hackathon BUIDL page today.

---

## Fetch failures / UNKNOWN

| Item | Status |
|---|---|
| `circlefin/arc-node` GitHub HTML homepage | Thin; README via raw **was** fetched |
| `arc-node` precompile Rust path `crates/execution/precompile/src/lib.rs` | 404 |
| `arc-node` GitHub code search for `0x1800…0004` | 0 files |
| Firecrawl search (DoraHacks) | 402 (credits) |
| `docs.x402.org/core-concepts/http-integration` | 404; used `client-server` + `http-402` instead |
| On-chain `eth_getCode` for ERC-8004 on 5042 | not run |
| Exhaustive A-Identity README scan for “SLH-DSA” / “Barkeep” | UNKNOWN beyond first ~150 lines |