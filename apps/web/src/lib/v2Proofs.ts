/**
 * V2 live-execution proofs. Every value here is an on-chain fact from Arc
 * mainnet (chain 5042), verified 2026-10-13. V1 proofs live elsewhere and are
 * untouched.
 *
 * Self-contained (no chain.ts import) so it runs under plain node --test;
 * chain.ts's import.meta.env is vite-only. Address values are asserted
 * exactly in v2Proofs.test.ts — update both if they ever change.
 *
 * Honesty rule for this module: the bridge entry MUST keep its chain-gated
 * status. Never present the bridge as executed.
 */

const ARC_EXPLORER = "https://explorer.arc.io";

export const V2_EXPLORER_TX = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;
export const V2_SOURCIFY = (address: string) => `https://repo.sourcify.dev/5042/${address}`;

export const V2_SWAP_PROOF = {
  kind: "swap",
  title: "Real swap — executed on Arc",
  detail: "0.005 USDC → 4,463 EURC base units · Uniswap V3 USDC/EURC 0.05% pool",
  amountIn: "5,000 base units (0.005 USDC)",
  amountOut: "4,463 base units (0.004463 EURC)",
  txHash: "0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c",
  block: "25808007",
  labels: ["agent-signed", "executor-relayed", "output returned to the vault", "1% slippage guard"],
} as const;

export const V2_SEND_PROOF = {
  kind: "send",
  title: "Real send — executed on Arc",
  detail: "0.001 USDC · 1,000 base units · V2 vault",
  txHash: "0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc",
  to: "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd",
  labels: ["agent-signed", "executor-relayed"],
} as const;

export const V2_BRIDGE_STATUS = {
  kind: "bridge",
  title: "Bridge — built, chain-gated",
  // The honest state. Do not soften: the vault code is correct, the chain blocks it.
  status: "chain-gated",
  body: "The V2 bridge path is implemented and unit-tested (42/42 forge tests): agent-signed CLASS_BRIDGE actions, the correct 7-parameter CCTP V2 depositForBurn, allowlisted destination domains and mint recipients.",
  limitation:
    "It cannot execute today: Arc's CCTP TokenMessenger rejects contract-initiated burns at the chain level. Proven with three minimal test contracts — EOAs burn fine, contracts revert. This is a chain limitation, not a Beacon bug.",
  eoaProof: {
    label: "Direct EOA burn with the same 7-parameter interface — the interface is correct",
    txHash: "0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1",
  },
} as const;

export const V2_DEPLOYMENTS = [
  {
    name: "BeaconUsdcVaultV2",
    role: "The firewall that can now swap — holds USDC, calls the router itself",
    address: "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe",
  },
  {
    name: "BeaconVaultFactoryV2",
    role: "Deploys V2 vaults — one per owner",
    address: "0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e",
  },
  {
    name: "BeaconReceiptRegistry",
    role: "V2 receipt registry — every V2 execution writes here",
    address: "0xcecb08b2cdacaf231b1838f20f932ad265fa2583",
  },
] as const;
