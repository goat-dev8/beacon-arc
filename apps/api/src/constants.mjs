export const CHAIN_ID = 5042;
export const ARC_USDC = "0x3600000000000000000000000000000000000000";
export const FACTORY = "0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b";
export const REGISTRY = "0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C";

export const CAPABILITIES = {
  chainId: CHAIN_ID,
  send: { executable: true },
  swap: {
    executable: false,
    reason: "Swap execution stays off until the Uniswap command allowlist is tested. No quote is invented.",
  },
  cctp: {
    executable: false,
    reason: "CCTP is not in this deploy. A burn is not a completed bridge.",
  },
  privacy: {
    executable: false,
    reason: "Arc private settlement is not executable. Beacon will not report a private transfer.",
  },
  pq: {
    executable: false,
    reason: "The PQ precompile ABI is not pinned. This is not a PQ wallet.",
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
