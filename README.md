# Beacon Arc

Beacon is an on-chain USDC firewall for AI agents on Arc mainnet (chain id 5042).

The owner sets the policy and the recipient allowlist. The agent signs an EIP-712 action. The executor can submit that signature and cannot change the recipient, amount, token, or deadline. The vault calls `USDC.transfer` itself. A database bearer does not move funds.

USDC on Arc is `0x3600000000000000000000000000000000000000` with 6 decimals. Native gas uses the same pool at 18 decimals. Those two views are not added together.

Privacy transfers, post-quantum wallets, and x402 settlement are not executable in this build. The product does not report them as successful.

Contracts live in `packages/contracts`. `forge test` is the contract suite. `npm test` covers decimal units and the ancestor-string guard.

Deployed on Arc mainnet:

| Contract | Address |
| --- | --- |
| Receipt registry | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` |
| Vault factory | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` |
| Vault | `0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6` |

The value-moving send is [0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab](https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab) (0.01 USDC, status success). The over-cap denial is [0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83](https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83) (status reverted, `OverCap`).
