# POST-PUSH-CHECKLIST — verifying the rescue deploy

Run through these after `rescue/p0` is merged to `main` and Vercel/Render have
finished deploying. Every check is wallet-free. If any check fails, do not
submit — fix forward on a new branch.

## 1. Web homepage — the proof section

https://beacon-arc-one.vercel.app/

- [ ] A "LIVE ON ARC MAINNET · CHAIN 5042" section renders with the headline
      "Proof, not promises."
- [ ] Stat strip reads **"0.030 USDC · 8 executions · 3 refusals"**.
- [ ] 6 contract cards, each linking to its Sourcify page (V1 + V2):
  - https://repo.sourcify.dev/5042/0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C
  - https://repo.sourcify.dev/5042/0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b
  - https://repo.sourcify.dev/5042/0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6
  - https://repo.sourcify.dev/5042/0xcecb08b2cdacaf231b1838f20f932ad265fa2583
  - https://repo.sourcify.dev/5042/0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e
  - https://repo.sourcify.dev/5042/0x8901AAa87035b80c70B1636697DaE899Ef67c6fe
- [ ] Tx cards linking to the explorer:
  - https://explorer.arc.io/tx/0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8 (Success — live vault send)
  - https://explorer.arc.io/tx/0x1a3e7cea053ea5c994e9ffd22f6962b97e4e86fbe2e860dc7f1a4175a1726c7f (Success — newest live vault swap)
  - https://explorer.arc.io/tx/0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03 (Reverted — live vault refusal)
  - https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83 (Reverted — first vault OverCap)
  - https://explorer.arc.io/tx/0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d (Success — larger live vault swap. `0xf4c87b61…` called a superseded vault.)
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
      `"executable": false` and a reason that says the quote is not a trade.
      It must not say the live vault has no swap function.

## 6. Judge quickstart

- [ ] Read `JUDGE-QUICKSTART.md` in the repo root and walk the 3-minute path
      exactly as written. If any step doesn't match what you see, fix the doc
      before submitting.

## 7. Submission readiness

- [ ] Grant 1 on the live vault is active until 2026-11-12T20:30:14Z. The older 2026-10-15 expiry was superseded. Read `grants(1)` before a demo.
- [ ] `BUILD_HISTORY.md` and `CURRENT_STATUS.md` describe the deployed state.
- [ ] No video work was added (owner records it separately).
