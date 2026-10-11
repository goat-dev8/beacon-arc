import { NETWORK } from "./chain";

const BY_CHAIN: Record<number, { origin: string; label: string }> = {
  5042: { origin: NETWORK.explorer, label: "Arc" },
  8453: { origin: "https://basescan.org", label: "Base" },
  1: { origin: "https://etherscan.io", label: "Ethereum" },
  56: { origin: "https://bscscan.com", label: "BNB Chain" },
};

function meta(chainId?: number | string | null) {
  const id = Number(chainId ?? NETWORK.chainId);
  return BY_CHAIN[id] ?? BY_CHAIN[NETWORK.chainId];
}

export function explorerForChain(chainId?: number | string | null): string {
  return meta(chainId).origin;
}

export function explorerTx(hash: string, chainId?: number | string | null): string {
  return `${meta(chainId).origin}/tx/${hash}`;
}

export function explorerAddress(address: string, chainId?: number | string | null): string {
  return `${meta(chainId).origin}/address/${address}`;
}

export function explorerLabel(chainId?: number | string | null): string {
  return meta(chainId).label;
}

export function storageScan(root: string): string {
  return `${NETWORK.storageScan}/?root=${root}`;
}
