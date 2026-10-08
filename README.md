# Beacon Arc

Beacon is an on-chain USDC firewall for AI agents on Arc mainnet (chain id 5042).

The owner sets the policy and the recipient allowlist. The agent signs an EIP-712 action. The executor can submit that signature and cannot change the recipient, amount, token, or deadline. The vault calls `USDC.transfer` itself. A database bearer does not move funds.

USDC on Arc is `0x3600000000000000000000000000000000000000` with 6 decimals. Native gas uses the same pool at 18 decimals. Those two views are not added together.

Privacy transfers, post-quantum wallets, and x402 settlement are not executable in this build. The product does not report them as successful.

Contracts live in `packages/contracts`. `forge test` is the contract suite. `npm test` covers decimal units and the ancestor-string guard.
