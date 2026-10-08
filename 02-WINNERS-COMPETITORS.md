# 02 — WINNERS & COMPETITORS
## Arc Microgrants — Merged Winner Forensics, Field Map, Competitor Intelligence
**Investigation date: 2026-10-06.**

---

# 1. WHAT PRIOR WINNERS ACTUALLY DID

The useful unit of analysis is:

Primitive
→ Problem
→ Insight
→ Mechanism
→ Decision
→ Execution
→ Verification
→ UX
→ Story

Not:
"Which buzzwords did they use?"

---

# 2. HACKMONEY WINNER PATTERNS

Prior Arc track winners included:

- **arctan(x)** — FX fragmentation → Arc used as settlement/liquidity hub.
- **Text-to-Chain** — smartphone/app barriers → SMS becomes a transaction interface.
- **ArcFlow** — idle treasury capital → programmable yield/payroll workflow.
- **Versus** — creator monetization → agents earn and distribute value continuously.

Important organizer signals:
- agentic money flows were common;
- invisible stablecoin settlement reduced UX friction;
- cross-chain became expected rather than sufficient;
- traditional financial workflows became interesting when they removed a real operational pain.

Lesson:
**The winning story is usually "a difficult workflow became materially better", not "we integrated more APIs."**

---

# 3. CANNES WINNER PATTERNS

Relevant winners included:

- Onda — pay the artist per play.
- PayMate — programmable service-credit pool for agents.
- NanoCrawl — agents pay publishers per page.
- ETHastic — device-to-device value transfer with delayed chain settlement.
- VEIL VPN — pay-as-you-go infrastructure with trust evidence.
- C.E.S.T.A — voice-first programmable money workflow.
- Predict It! / PolyPOP — prediction products with explicit settlement.

Organizer-described pattern:
**Physical infrastructure + programmable money repeatedly produced memorable demos.**

This pattern is useful as taste evidence, but it is not permission to clone the mechanism.

---

# 4. THE CURRENT FIELD

The more complete audit found **268 Arc-era public buidls** as of 2026-10-06.

The field is not 268 equally strong ideas. Deep audits indicate a hierarchy:

## Tier S — strongest audited contenders

- MergePay
- A NEW ONE
- Legwork
- Pigeonhole
- A-Identity

Additional strong Tier A/B examples include:
- PaidThrough
- Barkeep
- PQ Release Log
- BountyAgent

The strategic lesson is more important than the exact ranking:

**The strongest projects make the core claim visible in onchain semantics.**

---

# 5. CROWDING MAP

| Category | Current state | Strategic reading |
|---|---|---|
| DeFi / DEX / swap / liquidity | Very crowded | Avoid generic entry |
| Invoice / receipt / payroll | Very crowded | Leaders already obvious |
| Agent pay / x402 | Very crowded | Commodity unless mechanism changes |
| Launchpad / token | Very crowded | Dominated |
| Batch / multisend | Crowded | Arc Payrun owns the obvious pitch |
| Read-tools / dashboards | Crowded | Display is not enough |
| Bridge / CCTP | Crowded | Infrastructure alone is baseline |
| ROSCA / group finance | Crowded | Needs a strong new mechanism |
| Generic escrow / work | Crowded | ProofPay/BountyAgent/others occupy the lane |
| Identity / attestation | Crowded | PQ-specific gap remains narrower |
| Yield / credit | Crowded | Need differentiated risk or underwriting mechanism |
| Streaming / recurring | Crowded | Legwork is a strong reference |
| Games | Crowded | Harder path to a 500-USDC experimental grant |
| Offline / intermittent connectivity payments | No mechanism-level direct competitor identified in supplied sweep | Interesting white space, but must pass economic/protocol scrutiny |

---

# 6. DEEP COMPETITOR FORENSICS

## MergePay
Core:
External GitHub event
→ onchain cryptographic verification
→ payment.

Why strong:
The headline is literally implemented by contract semantics, and there is a real payout.

Weakness:
Narrow workflow / relayer UX.

Lesson:
**A thin product can be strong when the mechanism itself is surprising and auditable.**

## A NEW ONE
Core:
USDC launch curve
→ graduation
→ locked liquidity.

Why strong:
Large amount of actual implementation, strong tests, real mainnet deployment.

Weakness:
Admin/scoping concerns.

Lesson:
Persistence and precise contract semantics matter.

## Legwork
Core:
Recurring payment
→ execution
→ payment reimburses executor gas.

Why strong:
The protocol's stablecoin-native gas model is itself part of the mechanism.

Lesson:
**Using Arc as an economic mechanism is stronger than merely using Arc as a deployment chain.**

## Pigeonhole
Core:
Counterfactual deposit addresses
→ constrained sweep semantics.

Why strong:
The security property is embedded in bytecode.

Lesson:
Small primitives can be compelling when the contract itself is the product.

## A-Identity
Core:
identity
→ policy
→ spending enforcement.

Why strong:
Real enforcement occurs in contracts.

Weakness:
Broad scope and centralized oracle dependence.

Lesson:
Policy is valuable when it actually constrains onchain behavior.

## PQ Release Log
Core:
PQ-signed manifest
→ onchain verification
→ release record.

Why relevant:
It proves the PQ precompile is already productizable on Arc.

Why not necessarily enough:
A log/registry is narrower than a custody primitive.

---

# 7. OFFICIAL PRIOR ART

Circle itself has published Arc examples for:
- escrow
- nanopayments
- agentic commerce

But the supplied research notes that the official examples were testnet/custodial/SDK-oriented rather than finished mainnet trustless products.

Strategic implication:
Do not merely reproduce Circle's own demo patterns.

Look for the missing product layer.

---

# 8. COMPETITOR TAXONOMY

## Direct
Same user + same pain + same mechanism.

## Adjacent
Same pain, different mechanism.

## Infrastructure
Could make our mechanism unnecessary.

## UX
Same outcome, radically simpler surface.

## Agent
Same autonomous behavior.

## Trading/decision
Same decision logic.

## Protocol-native
Same primitive.

A competitor review is incomplete unless it answers:

> "Could the strongest existing team add our core feature without rewriting its product?"

If YES, differentiation may be cosmetic.

---

# 9. WHITE-SPACE DISCIPLINE

A white space has four distinct confidence levels:

### LEVEL 1 — Keyword gap
No obvious keyword matches.

### LEVEL 2 — Mechanism gap
No audited project appears to implement the mechanism.

### LEVEL 3 — Problem gap
The user problem itself remains poorly served.

### LEVEL 4 — Structural gap
The target protocol enables a materially new mechanism for the unresolved problem.

Only Level 3–4 white space should drive final selection.

---

# 10. WHAT THE COMBINED RESEARCH SAYS

The field rewards:

- explicit mechanisms;
- real onchain proof;
- protocol-native behavior;
- simple stories;
- real-world utility;
- unusual but defensible primitives;
- minimal trust assumptions.

The field punishes:

- generic AI wrappers;
- generic payments;
- dashboards presented as products;
- server-heavy mechanisms;
- copied lanes;
- roadmap-feature fantasies;
- complexity without mechanism.

---

# 11. IMPORTANT COMPETITIVE CORRECTION

The first agent's smaller census was useful as an early signal, but the second agent's 268-build audit is the trusted state.

Likewise, any claim that an entire category is globally empty must be softened to:

> "No direct mechanism-level competitor was identified in the audited field available on 2026-10-06."

That is strong enough to inform strategy without pretending the web is mathematically exhaustible.
