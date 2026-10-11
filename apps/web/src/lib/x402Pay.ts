import type { Hex } from "viem";
import { ensureArcNetwork } from "./wallet";

/**
 * x402 is P2 and not the Beacon Arc job economy.
 * Native jobs lock USDC in BeaconJobEscrow. This helper refuses instead of
 * approving a USDC.e facilitator that is not wired.
 */
export async function payX402Erc20(_params: {
  amountUsdt0: string;
  payTo: string;
  token: string;
}): Promise<{
  mode: "erc20-pull";
  from: string;
  to: string;
  token: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  chainId: number;
  network: string;
  approveTxHash: Hex;
}> {
  await ensureArcNetwork();
  throw new Error(
    "x402 is not enabled. Beacon will not invent a Circle facilitator.",
  );
}

/** @deprecated Use payX402Erc20 — faucet USDC has no EIP-3009. */
export const signX402Payment = payX402Erc20;
