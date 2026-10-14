# POST-PUSH-CHECKLIST — verifying the rescue deploy

Run through these after `rescue/p0` is merged to `main` and Vercel/Render have
finished deploying. Every check is wallet-free. If any check fails, do not
submit — fix forward on a new branch.

## 1. Web homepage — the proof section

https://beacon-arc-one.vercel.app/

- [ ] A "LIVE ON ARC MAINNET · CHAIN 5042" section renders with the headline
      "Proof, not promises."
- [ ] Stat strip reads **"0.026 USDC · 4 executions · 1 refusal"**.
- [ ] 6 contract cards, each linking to its Sourcify page (V1 + V2):
  - https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C
  - https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b
  - https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6
  - https://repo.sourcify.dev/5042/0xcecb08b2cdacaf231b1838f20f932ad265fa2583
  - https://repo.sourcify.dev/5042/0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e
  - https://repo.sourcify.dev/5042/0x8901AAa87035b80c70B1636697DaE899Ef67c6fe
- [ ] Tx cards linking to the explorer:
  - https://explorer.arc.io/tx/0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d (Success — live vault `0x8901…` swap. `0xf4c87b61…` called a superseded vault.)
  - https://explorer.arc.io/tx/0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3 (Success — "The real payment — a third party", V1)
  - https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83 (Failed — OverCap denial)
- [ ] The "Not in this deploy" honesty section is still present and unchanged.

## 2. Verify page — the green MATCH state

https://beacon-arc-one.vercel.app/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30

- [ ] Shows `0.01 USDC · 10000 base units`, nonce 1.
- [ ] The cross-check panel is **green**: "Independent RPC agrees with API"
      (not the old red false-negative).
- [ ] Recipient row reads `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`.

## 3. Vault setup and the agent console

https://beacon-arc-one.vercel.app/flow/vault

- [ ] The page is setup for the live vault `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`: Create, Fund, Spending limits, Agent and recipients.
- [ ] Proof history shows the first vault `0x71Ef…` and does not offer a setup button for it.
- [ ] The page background fills the viewport. There is no white dotted region under the last section.
- [ ] "Task the agent" goes to https://beacon-arc-one.vercel.app/flow/agent.

https://beacon-arc-one.vercel.app/flow/agent

- [ ] "Task the agent to send" and "Task the agent to swap" are enabled when `GET /v1/agent/status` says `ready: true`.
- [ ] If that endpoint says the key is missing, the page names `AGENT_PRIVATE_KEY` and the Render dashboard. It does not show a grey button.
- [ ] The first click shows the exact action. The second click is the owner's confirm and is a real transaction.

## 4. Flow chat

https://beacon-arc-one.vercel.app/flow

- [ ] `swap 0.001` shows the exact agent action, including the quote and the 1% floor. It does not say the live vault will not trade.
- [ ] `send 0.001 USDC to 0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd` does the same for a send. Reply `confirm` to broadcast.
- [ ] CCTP and privacy stay read-only. Neither offers a trade button.

## 5. API — Render

- [ ] https://beacon-arc-api.onrender.com/ready → 200, body contains
      `"chainId": 5042` (or `chain_id` 5042).
- [ ] https://beacon-arc-api.onrender.com/v1/quote/swap → 200, body contains
      `"venue": "uniswap-v3"` and `"executable": false`.
      (The quoted rate should be near ~0.89 EURC per USDC — e.g. amountOut
      892767 for amount 1000000 — not ~0.15. If the venue reads "uniswap-v2"
      with `"indicative": true`, the v3 pin check failed; treat as degraded.)

## 6. Judge quickstart

- [ ] Read `JUDGE-QUICKSTART.md` in the repo root and walk the 3-minute path
      exactly as written. If any step doesn't match what you see, fix the doc
      before submitting.

## 7. Submission readiness

- [ ] Grant 1 is still valid (expires 2026-10-15T05:06:06Z — after the
      2026-10-14 23:59 ET deadline, so demos work; set a fresh grant after).
- [ ] `BUILD_HISTORY.md` and `CURRENT_STATUS.md` describe the deployed state.
- [ ] No video work was added (owner records it separately).
