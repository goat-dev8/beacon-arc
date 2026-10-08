export const CHAIN_ID = 5042;

export const ARC_USDC = "0x3600000000000000000000000000000000000000";
export const ARC_EURC = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";
export const UNISWAP_V2_ROUTER = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa";

export const ERC20_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;
export const DECIMAL_GAP = 10n ** 12n;

if (CHAIN_ID !== 5042) {
  throw new Error("Beacon Arc is chain 5042");
}
