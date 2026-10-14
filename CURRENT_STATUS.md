# Beacon Arc — current status

Verified by direct Arc RPC and production HTTP reads at 2026-10-14T22:58:44Z. This replaces the 2026-10-13 rescue snapshot. Git `main` is `5a2ec84` plus the proof-count and chat-vault fixes in the working tree. Do not treat an older paragraph in `BUILD_HISTORY.md` as the live balance.

## Live vault

- Chain 5042. Vault `0x8901AAa87035b80c70B1636697DaE899Ef67c6fe`. Factory `0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e`. Registry `0xcecb08b2cdacaf231b1838f20f932ad265fa2583`.
- Owner `0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034`. Executor `0x412045b7c64d471DE57024f11E080289e6082172` held about 0.0069 native USDC at the read.
- Not paused. Policy version 1. maxPerTx 10000. Window 50000. windowSpent 10000. Nonce 6.
- Grant 1 is active. Agent `0xc3b183D5e4436C20282650348BE2D6c94c4142dc`. Scopes 7. maxPerTx 10000. Expiry `2026-11-12T20:30:14Z`. The October 15 expiry in older notes is stale.
- Balances at the read: 0.01 USDC and 0.006245 EURC. Those are holdings, not volume.
- Volume from registry `Recorded` events, both vaults: 30,000 base units (0.030 USDC) across 8 successful executions. 3 transactions reverted with no `Recorded` event.

## What a judge should open

- Web https://beacon-arc-one.vercel.app
- API https://beacon-arc-api.onrender.com (`GET /ready` returned `{"ok":true,"chainId":5042}`)
- Agent status ready for the live vault. The server holds the agent key. The owner key is not on the server.
- `GET /v1/quote/swap?amount=1000000` returned `venue: uniswap-v3`. `executable: false` means the quote is not a broadcast.
- `GET /v1/chats` is deployed and returned the saved owner conversation.
- Repo https://github.com/goat-dev8/beacon-arc
- Wallet-free path: `JUDGE-QUICKSTART.md`

## Proofs that count

Live vault successes:

- Send 1000, nonce 0: `0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc` block 25808857. Receipt `0x6a21acbab9e57667c3673c7c9ed528d463268e507b7b4c5fa73b5915b5aebaf8`.
- Send 1000, nonce 1: `0xf290d9ed0d312dfb8f6edc913be0e99bb0f7bbdce4a21cd7b300ae6cb15ff309` block 25818425.
- Swap 5000 to 4463 EURC, nonce 2: `0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d` block 25818567.
- Send 1000, nonce 3: `0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8` block 25858345. Receipt `0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f`.
- Swap 1000 to 891 EURC, nonce 4: `0x26e76d540ef603bcfa3208d250986a808f952dc72ddab7d2c66f974329879954` block 25859055.
- Swap 1000 to 891 EURC, nonce 5: `0x1a3e7cea053ea5c994e9ffd22f6962b97e4e86fbe2e860dc7f1a4175a1726c7f` block 25859531. Receipt `0x0fa111b17b2664dfc6f7a433cdbe270e38343e5dc65a6995de430dd5b7a27968`.

Live vault refusals, status reverted, no receipt event: `0x9c03853ae85d2db96f3517343101eff200351a3a1dc339bf1e43e517b7c308a7` block 25818664, and `0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03` block 25859160.

First vault, historical, not the current path:

- Send 10000 to the owner: `0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab`. Receipt `0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a`.
- Send 10000 to `0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd`: `0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3`. Receipt `0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30`.
- OverCap revert: `0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83`.

`0xf4c87b61…` called superseded vault `0xc3d405eb…`. Do not cite it as the live swap.

## Not executable

- Standard USDC CCTP from the vault. `executeBridge` is in the V2 source. Arc's TokenMessenger rejects a contract-started burn. EOA burn `0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1` succeeded. No completed bridge is claimed.
- CCTP-X EURC. Production Iris at the same read listed EURC token id `0x6ca9e29fa53becc29becaf4a90b9ca7a995ad4d2234880da13ca38c657fb241c` enabled on domain 0, domain 6, and domain 26. The Arc token is `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1`. Token manager `0x8c27579e24f9f19d96724e19fc059dacd1469e10` has code. `CrossChainTokenService` `0x431871229103b780868f8C6BB820cd16ECf942BC` has 141 bytes of code. cirBTC and WETH are listed on domains 0 and 26 only. A vault call was not simulated and is not wired. A new vault would be required. None was deployed.
- Privacy, a PQ wallet, x402 settlement, and ERC-8004 registration.

## Domain warning

Vercel has only `beacon-arc-one.vercel.app`. MetaMask's "Request from" triangle is Blockaid scoring that origin. No custom domain is attached. No new report was filed. The warning is not cleared.

## Production URLs

- Web: https://beacon-arc-one.vercel.app
- API: https://beacon-arc-api.onrender.com
- Vault setup: https://beacon-arc-one.vercel.app/flow/vault
- Agent console: https://beacon-arc-one.vercel.app/flow/agent
- Newest live receipt: https://beacon-arc-one.vercel.app/verify/0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f
