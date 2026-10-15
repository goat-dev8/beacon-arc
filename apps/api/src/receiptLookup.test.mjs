import { test } from "node:test";
import assert from "node:assert/strict";
import { readReceipt } from "./chain.mjs";
import { REGISTRY, V2_REGISTRY } from "./constants.mjs";

const HASH = "0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f";
const ROW_V2 = ["0x8901AAa87035b80c70B1636697DaE899Ef67c6fe", "0xc3b183D5e4436C20282650348BE2D6c94c4142dc", "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd", 1000n, 3n, true];
const EMPTY = ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", 0n, 0n, false];

// Fake client: returns the row stored for each registry address.
function clientWith(rows) {
  const seen = [];
  return {
    seen,
    async readContract({ address, args }) {
      seen.push(address);
      assert.equal(args[0], HASH);
      return rows[address.toLowerCase()] ?? EMPTY;
    },
  };
}

test("readReceipt finds a V2 receipt in the active V2 registry", async () => {
  const client = clientWith({ [V2_REGISTRY.toLowerCase()]: ROW_V2 });
  const receipt = await readReceipt(client, HASH);
  assert.equal(receipt.exists, true);
  assert.equal(receipt.registry, V2_REGISTRY);
  assert.equal(receipt.vault, ROW_V2[0]);
  assert.equal(receipt.amount, "1000");
  assert.equal(receipt.nonce, "3");
});

test("readReceipt falls back to the V1 registry for pre-V2 receipts", async () => {
  const v1Row = [...ROW_V2];
  const client = clientWith({ [REGISTRY.toLowerCase()]: v1Row });
  const receipt = await readReceipt(client, HASH);
  assert.equal(receipt.exists, true);
  assert.equal(receipt.registry, REGISTRY);
});

test("readReceipt reports no receipt when neither registry has the hash", async () => {
  const client = clientWith({});
  const receipt = await readReceipt(client, HASH);
  assert.equal(receipt.exists, false);
  assert.deepEqual(client.seen, [V2_REGISTRY, REGISTRY]);
});
