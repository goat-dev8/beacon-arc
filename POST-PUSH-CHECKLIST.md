# POST-PUSH-CHECKLIST — verifying the rescue deploy

Run through these after `rescue/p0` is merged to `main` and Vercel/Render have
finished deploying. Every check is wallet-free. If any check fails, do not
submit — fix forward on a new branch.

## 1. Web homepage — the proof section

https://beacon-arc-one.vercel.app/

- [ ] A "LIVE ON ARC MAINNET · CHAIN 5042" section renders with the headline
      "Proof, not promises."
- [ ] Stat strip reads **"0.02 USDC · 2 executions · 1 refusal"**.
- [ ] 3 contract cards, each linking to its Sourcify page:
  - https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C
  - https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b
  - https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6
- [ ] 3 tx cards linking to the explorer:
  - https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab (Success)
  - https://explorer.arc.io/tx/0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3 (Success — "The real payment — a third party")
  - https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83 (Failed — OverCap denial)
- [ ] The "Not in this deploy" honesty section is still present and unchanged.

## 2. Verify page — the green MATCH state

https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30

- [ ] Shows `0.01 USDC · 10000 base units`, nonce 1.
- [ ] The cross-check panel is **green**: "Independent RPC agrees with API"
      (not the old red false-negative).
- [ ] Recipient row reads `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`.

## 3. Vault journey — progress rail

https://beacon-arc-one.vercel.app/flow/vault

- [ ] The StepRail shows the 8 steps with done/current/locked states.
- [ ] The send button is disabled on a malformed recipient **with** the inline
      hint "Enter a valid 0x recipient address to enable signing".

## 4. Flow chat — the honest swap card

https://beacon-arc-one.vercel.app/flow (chat)

- [ ] The swap card shows a **permanent read-only banner** above the quote and
      a disabled button reading **"Swaps stay off — the vault will not trade"**.
- [ ] There is no "Confirm swap" button anywhere.

## 5. API — Render

- [ ] https://beacon-arc-api.onrender.com/ready → 200, body contains
      `"chainId": 5042` (or `chain_id` 5042).
- [ ] https://beacon-arc-api.onrender.com/v1/quote/swap → 200, body contains
      `"venue": "uniswap-v3"` and `"executable": false`.
      (The quoted rate should be near ~0.89 EURC per USDC, not ~0.15.)

## 6. Judge quickstart

- [ ] Read `JUDGE-QUICKSTART.md` in the repo root and walk the 3-minute path
      exactly as written. If any step doesn't match what you see, fix the doc
      before submitting.

## 7. Submission readiness

- [ ] Grant 1 is still valid (expires 2026-10-15T05:06:06Z — after the
      2026-10-14 23:59 ET deadline, so demos work; set a fresh grant after).
- [ ] `BUILD_HISTORY.md` and `CURRENT_STATUS.md` describe the deployed state.
- [ ] No video work was added (owner records it separately).
