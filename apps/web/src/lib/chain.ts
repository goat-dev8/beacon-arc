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
