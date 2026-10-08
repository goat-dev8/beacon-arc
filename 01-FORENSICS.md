# 01 — FORENSICS
## Arc Microgrants — Merged Hackathon + Protocol Forensics
**Merged from two independent agent audits. Investigation date: 2026-10-06.**
**Status: research baseline consolidated; concept selection is deliberately separated into `04-FINAL-CONCEPT.md`.**

---

## 0. Executive Forensic Summary

### Contest state
- Program: Arc Microgrants by Circle, DoraHacks.
- Pool: 20 grants × 500 USDC = 10,000 USDC.
- Submission deadline: 2026-10-14 23:59 ET / 2026-10-15 03:59 UTC.
- Review: rolling; decisions targeted by 2026-10-21.
- Core eligibility gate: the project must already be deployed and working on Arc mainnet when submitted.
- Required public evidence: live deployment, public repo, short description including what the project uses Arc for, public builder profile.
- Design-only, deck-only, testnet-only, no-Arc, and already-funded same-work submissions are out.

### Competition state
Two audits converged on the critical fact that the early estimate of ~55 public Arc builds was obsolete. The more complete feed audit found **268 Arc-era public buidls** as of 2026-10-06, while the private submission form cannot be inferred from the public buidl count. The 55-build snapshot is retained only as an earlier observation.

### Winning pattern
The strongest observed projects make the headline claim equal to a real mechanism that is visible in contract semantics and live transactions. The clearest example is MergePay: a GitHub event triggers a real USDC payout with a visible onchain causal link. This is evidence for a proof-first judging posture, not proof of hidden judge weights.

---

# 1. SOURCE REGISTRY

| ID | Source | Authority | What it is allowed to prove |
|---|---|---|---|
| S001 | DoraHacks Arc Microgrants page | Primary | Program rules, eligibility, submission requirements, published judging language |
| S002 | DoraHacks hackathon API metadata | Primary | Timeline, prize metadata, registration/buidl metadata |
| S003 | Arc official docs / llms index and linked technical docs | Primary | Protocol behavior, architecture, addresses, SDKs, EVM differences, documented limitations |
| S004 | Arc mainnet RPC probes | Primary execution evidence | Chain ID, code existence, block height, selected live behavior |
| S005 | Arc HackMoney 2026 winner recap | Primary organizer voice | Prior winners, organizer-described patterns and lessons |
| S006 | Arc ETHGlobal Cannes 2026 recap | Primary organizer voice | Prior winners, organizer-described patterns and lessons |
| S007 | DoraHacks public Arc-era buidl feed + detail fetches | Primary public field data | Public build claims, links, stated contracts/txs; not proof of private submission |
| S008 | Deep audits of 18 competitor repos + live onchain checks | Primary code/execution evidence | Mechanism reality, deployment state, tests, some observed usage |
| S009 | User-supplied `archack.md` census | Secondary / field analysis | Earlier ~55-build census and preliminary clustering; superseded for completeness by S007 |
| S010 | Official Circle Arc sample repos | Primary prior art | What Circle itself demonstrated in sample form; not evidence of mainnet production |
| S011 | Arc: Post-Quantum Roadmap | Primary organizer/protocol source | Arc's post-quantum strategy and why wallet authorization matters |
| S012 | Arc execution-layer docs | Primary protocol docs | Live five custom precompiles, including PQ signature verification; APS and Stablecoin Services are planned |
| S013 | Arc Mainnet launch pressroom | Primary organizer/protocol source | Mainnet positioning, PQ signatures today, broader roadmap |

---

# 2. EVIDENCE LABELS

Use exactly:

- **VERIFIED** — independently confirmed by live execution, onchain state, source code, or direct primary evidence.
- **DOCUMENTED** — explicitly stated by an official source, but not independently executed in this investigation.
- **EXPERIMENTAL** — available with beta/preview/unstable qualification.
- **PLANNED** — roadmap or future capability.
- **INFERRED** — conclusion derived from multiple pieces of evidence.
- **UNKNOWN** — insufficient evidence.

Never upgrade UNKNOWN to TRUE because a concept needs it.

---

# 3. HACKATHON FORENSICS

## 3.1 Published judging language

Official program language identifies:
1. Relevance to Arc
2. Technical credibility
3. Quality of what was built
4. Whether the project is worth taking further
5. Promise counts for more than traction

Interpretation rule:

**Arc relevance must be load-bearing.**
A generic product deployed on Arc is not automatically Arc-native.

## 3.2 Hard gates

A candidate is not viable if:
- no working Arc mainnet deployment at submission;
- no public repo;
- no credible Arc-specific use;
- it is merely a mockup/deck/testnet artifact;
- it is the same work already funded by Circle/Arc.

## 3.3 What the program does NOT establish

UNKNOWN:
- exact private submission count;
- exact judge-by-judge scoring weights;
- exact panel composition unless separately verified;
- whether any particular public buidl actually pressed Submit.

---

# 4. ARC MAINNET FORENSICS

## 4.1 Network identity

- Mainnet chain ID: **5042** — VERIFIED by live RPC.
- Public RPC: `https://rpc.mainnet.arc.io`.
- Explorer: `https://explorer.arc.io`.
- USDC is the native gas unit; the ERC-20 face uses 6 decimals while the native accounting representation uses 18 decimals — VERIFIED/DOCUMENTED.
- Arc uses an EWMA-smoothed USDC-denominated fee model; official docs state a normal-condition target around ~$0.001 per transaction.
- Blocks/finality are designed for very fast deterministic settlement; official docs position this as a core property.

## 4.2 Protocol-native execution primitives

Official Arc docs currently expose five custom precompiles:

| Primitive | Mainnet address shorthand | Status |
|---|---|---|
| Native Coin Authority | `0x1800..0000` | LIVE |
| Native Coin Control | `0x1800..0001` | LIVE |
| System Accounting | `0x1800..0002` | LIVE |
| CallFrom | `0x1800..0003` | LIVE |
| **PQ Signature Verify (SLH-DSA-SHA2-128s)** | **`0x1800..0004`** | **LIVE** |

The official execution-layer page states that the PQ Signature Verify precompile verifies `SLH-DSA-SHA2-128s` signatures.

Arc Privacy Sector (APS) and protocol-level Stablecoin Services remain **PLANNED**, not live, according to the current docs.

---

# 5. IMPORTANT ARC TECHNICAL GOTCHAS

## 5.1 Decimal split
Native USDC accounting and ERC-20 USDC use different decimal representations. Mixing them can introduce a 10^12 unit error.

**DO:** keep ERC-20 amount math explicitly in 6-decimal token units unless native transfers are intentionally involved.

**DON'T:** assume `msg.value` and `USDC.balanceOf()` use the same raw unit.

## 5.2 Gas floor
The agent audits report a ~20 gwei lower transaction pricing floor on mainnet and observed silent-drop behavior when below the floor.

**DO:** verify current fee rules against the live docs/RPC before broadcasting.

**DON'T:** treat a missing receipt as a contract revert until mempool/fee behavior is ruled out.

## 5.3 Two-state UX
Arc documentation describes a pending → final model rather than Ethereum-style multi-confirmation UX.

**DO:** design around pending/final.

**DON'T:** invent arbitrary confirmation-count semantics.

## 5.4 Blocklist
The audits report deterministic blocklist-related reverts and gas-loss implications for relayers.

**DO:** test blocked-address failure paths before using permissionless relayers.

**DON'T:** assume every revert will produce an ordinary receipt trail.

## 5.5 Local simulation
Standard local EVM tooling may not reproduce Arc-specific semantics.

**DO:** use Arc-specific development tooling when validating Arc-specific behavior.

**DON'T:** infer mainnet behavior from a generic local Anvil run.

## 5.6 Time ordering
Agent audits identified non-standard timestamp granularity and recommend block-number ordering for strict sequencing.

**DO:** use block number / explicit nonces when ordering matters.

---

# 6. SDK / TOOLING FORENSICS

Current official builder surface includes:
- Arc Foundry tooling
- Arc App Kits
- Circle wallet/integration infrastructure
- x402 batching utilities
- official integration docs for EIP-3009 and related flows

Rule:
SDK availability does not prove the product idea is differentiated.

The SDK is an implementation accelerator, not a product strategy.

---

# 7. PRIMITIVE QUALITY

Classify protocol capabilities as:

### LOAD-BEARING
A project would materially change if the primitive disappeared.

### IMPORTANT INFRASTRUCTURE
Useful, but replaceable.

### CONVENIENCE
Reduces implementation effort.

### DECORATION
Makes the project look more technical without changing its value.

The final concept must rely on at least one genuinely load-bearing capability.

---

# 8. PROTOCOL ARCHAEOLOGY PRINCIPLE

For every protocol capability the investigation should reconstruct:

PRIMITIVE
→ CAPABILITY
→ CONSTRAINTS
→ NEW POSSIBILITY
→ USER PROBLEM
→ MECHANISM

The strongest discovery opportunities occur when a capability enables something that was previously:
- economically impractical,
- operationally fragile,
- trust-heavy,
- impossible without a centralized intermediary,
- too slow,
- or too expensive at small transaction sizes.

---

# 9. NEGATIVE EVIDENCE DISCIPLINE

Absence claims must be bounded.

Do NOT write:
> "Nobody has ever built X."

Prefer:
> "No X was identified in the 268-build public field plus the 18 deep audits available to this investigation as of 2026-10-06."

This distinction matters especially for competitor white space.

---

# 10. CURRENT RESEARCH CONCLUSION

The combined research supports the following battlefield facts:

1. Generic payments, x402, invoices, batch payouts, launchpads, ROSCA, dashboards/read tools, and ordinary escrow are heavily occupied.
2. "AI agent" framing is common and therefore not inherently differentiating.
3. Cross-chain/CCTP/Gateway usage is often baseline rather than novelty.
4. The strongest builds place the core promise inside a verifiable mechanism rather than a server wrapper.
5. A mainnet transaction proving the core claim is much more valuable than a long architecture diagram.
6. Prior Circle/Arc winners repeatedly succeeded when programmable money connected to a concrete real-world workflow or a distinctive technical primitive.
7. Arc's live PQ signature precompile is a genuinely unusual load-bearing primitive with official roadmap relevance.
8. Offline/physical resilience is a compelling opportunity shape, but the offline-payment concept must survive a stricter protocol-necessity and economic-solvency audit than the first agent gave it.

---

# 11. EXTERNAL PRIMARY VALIDATION USED IN THE MERGE

- Arc Post-Quantum Roadmap: `https://www.arc.io/blog/arcs-quantum-resistant-design-and-roadmap-why-it-matters`
- Arc execution layer: `https://docs.arc.io/arc/concepts/execution-layer`
- Arc mainnet launch: `https://www.arc.io/pressroom/circle-launches-arc-mainnet-an-economic-operating-system-for-the-internet`

These sources confirm that Arc treats PQ wallet authorization as a real long-term design concern and that the PQ signature verification primitive is live on the execution layer.
