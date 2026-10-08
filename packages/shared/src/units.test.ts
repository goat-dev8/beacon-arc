import assert from "node:assert/strict";
import test from "node:test";
import { ARC_USDC, CHAIN_ID } from "./constants.ts";
import { assertNotSummed, erc20ToNative, nativeToErc20 } from "./units.ts";

test("1 USDC is 1_000_000 base units, not 1e18", () => {
  assert.equal(1_000_000n, 1_000_000n);
  assert.notEqual(1_000_000n, 10n ** 18n);
  assert.equal(erc20ToNative(1_000_000n), 10n ** 18n);
});

test("native dust rounds down and is not counted as user spend", () => {
  assert.equal(nativeToErc20(10n ** 18n + (10n ** 12n) - 1n), 1_000_000n);
  assert.equal(nativeToErc20(10n ** 12n - 1n), 0n);
});

test("adding the two balance views throws", () => {
  assert.throws(() => assertNotSummed(10n ** 18n, 1_000_000n), /one pool/);
});

test("chain and USDC address stay pinned", () => {
  assert.equal(CHAIN_ID, 5042);
  assert.equal(ARC_USDC, "0x3600000000000000000000000000000000000000");
});
