import { DECIMAL_GAP } from "./constants.ts";

/** 6-decimal USDC units to 18-decimal native units. Exact. */
export function erc20ToNative(amount6: bigint): bigint {
  if (amount6 < 0n) throw new Error("negative amount");
  return amount6 * DECIMAL_GAP;
}

/** 18-decimal native units to 6-decimal USDC units. Dust rounds down. */
export function nativeToErc20(amount18: bigint): bigint {
  if (amount18 < 0n) throw new Error("negative amount");
  return amount18 / DECIMAL_GAP;
}

/**
 * Balances from eth_getBalance and USDC.balanceOf are the same pool.
 * Callers must not add them. This throws so a summed total cannot ship.
 */
export function assertNotSummed(nativeBalance: bigint, erc20Balance: bigint): never {
  void nativeBalance;
  void erc20Balance;
  throw new Error("native and ERC-20 USDC are one pool; do not add them");
}
