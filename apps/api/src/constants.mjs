export const CHAIN_ID = 5042;
export const ARC_USDC = "0x3600000000000000000000000000000000000000";
export const FACTORY = "0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b";
export const REGISTRY = "0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C";
export const REGISTRY_DEPLOY_BLOCK = 24847984n;

// Uniswap v3 on Arc (5042), verified on-chain 2026-10-13 via eth_call:
// - factory.getPool(USDC, EURC, 500) -> V3_USDC_EURC_500
// - SwapRouter02.factory() -> V3_FACTORY
// - factory.feeAmountTickSpacing(3000) -> 60
// - QuoterV2.quoteExactInputSingle(1 USDC) -> ~0.893 EURC (returns data, no revert parsing needed)
// Checksums validated against EIP-55 (the deploy record's casing for the
// router and pool was wrong and is corrected here).
// Sources: Uniswap/contracts PR #144 (deployment records), Uniswap v3-subgraph repo (Arc entry).
export const V3_FACTORY = "0xf0db7b58379503491d857dB50AC9ece64c653918";
export const V3_ROUTER02 = "0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77";
export const V3_QUOTER = "0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468";
export const V3_FEE = 500;
export const V3_USDC_EURC_500 = "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1";

export const CAPABILITIES = {
  chainId: CHAIN_ID,
  send: { executable: true },
  swap: {
    executable: false,
    reason: "Uniswap V3 QuoterV2 quotes USDC to EURC on the 0.05% pool. The deployed vault has no swap function, so Beacon will not trade.",
  },
  cctp: {
    executable: false,
    reason: "CCTP domain 26 is on Arc. This vault cannot burn or mint, so a burn is not a completed bridge.",
  },
  privacy: {
    executable: false,
    reason: "Arc Privacy Sector is planned and is not on mainnet. Beacon will not report a private transfer.",
  },
  pq: {
    executable: false,
    reason: "The PQ precompile at 0x1800…0004 is 1 byte on mainnet. This is not a PQ wallet.",
  },
  x402: {
    executable: false,
    reason: "x402 needs a Circle facilitator key, which is not configured.",
  },
  erc8004: {
    executable: false,
    reason: "Registry proxies have code. Beacon has not matched the implementation selectors, so it does not register.",
  },
};
