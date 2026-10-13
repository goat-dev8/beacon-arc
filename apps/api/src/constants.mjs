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

// Beacon V2 (deployed 2026-10-13, Sourcify exact_match, chain 5042).
// V1 (0x71Ef...) stays live and untouched; V2 is a separate vault.
export const V2_REGISTRY = "0xcecb08b2cdacaf231b1838f20f932ad265fa2583";
export const V2_FACTORY = "0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e";
export const V2_VAULT = "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe";
export const ARC_EURC = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";
export const CCTP_MESSENGER_V2 = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";

export const CAPABILITIES = {
  chainId: CHAIN_ID,
  send: { executable: true },
  swap: {
    executable: false,
    reason: "The V1 vault (0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6) is send-only and has no swap function, so Beacon will not trade from V1. V2 executes swaps — see the v2 detail.",
    // V2 (BeaconUsdcVaultV2): swap IS executable via agent-signed executeSwap.
    // Top-level executable stays false for the default V1 vault; V2 is explicit.
    v2: {
      executable: true,
      via: "agent-signed executeSwap on BeaconUsdcVaultV2",
      vault: V2_VAULT,
      proof: {
        txHash: "0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c",
        block: "25808007",
        amountIn: "5000",
        amountOut: "4463",
        tokenOut: ARC_EURC,
        venue: "uniswap-v3",
      },
    },
  },
  cctp: {
    executable: false,
    reason: "The V2 bridge path is implemented (agent-signed CLASS_BRIDGE, correct 7-parameter CCTP V2 depositForBurn), but Arc's CCTP TokenMessenger currently rejects contract-initiated burns at the chain level — a chain limitation, not a Beacon bug. Direct EOA burns with the same interface work (tx 0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1).",
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
