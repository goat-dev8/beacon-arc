export const NETWORK = {
  chainId: 5042,
  name: "Arc",
  rpc: import.meta.env.VITE_RPC_URL ?? "https://rpc.mainnet.arc.io",
  explorer: "https://explorer.arc.io",
  storageScan: "https://explorer.arc.io",
  faucet: "https://explorer.arc.io",
} as const;

const USDC = "0x3600000000000000000000000000000000000000" as `0x${string}`;
const REGISTRY = "0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C" as `0x${string}`;
const FACTORY = "0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b" as `0x${string}`;
const VAULT = "0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6" as `0x${string}`;
const EXECUTOR = "0x412045b7c64d471DE57024f11E080289e6082172" as `0x${string}`;

export const CONTRACTS = {
  usdc: USDC,
  receiptRegistry: REGISTRY,
  vaultFactory: FACTORY,
  vault: VAULT,
  executor: EXECUTOR,
  escrow: VAULT,
  jobRegistry: REGISTRY,
  payee: VAULT,
  safeFactory: FACTORY,
  agentVault: VAULT,
  evidenceAnchor: REGISTRY,
} as const;

// Beacon V2 (deployed 2026-10-13, Sourcify exact_match). V1 above stays live.
const V2_VAULT = "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe" as `0x${string}`;
const V2_FACTORY = "0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e" as `0x${string}`;
const V2_REGISTRY = "0xcecb08b2cdacaf231b1838f20f932ad265fa2583" as `0x${string}`;

export const V2_CONTRACTS = {
  vault: V2_VAULT,
  vaultFactory: V2_FACTORY,
  receiptRegistry: V2_REGISTRY,
  executor: EXECUTOR,
} as const;
