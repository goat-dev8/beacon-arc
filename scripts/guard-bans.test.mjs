import assert from "node:assert/strict";
import test from "node:test";
import { findBans, scanRuntime } from "./guard-bans.mjs";

test("banned ancestor strings are detected", () => {
  const sample = ["evm", "rpc.0", "g.ai"].join("");
  const hits = findBans(`use ${sample}`);
  assert.ok(hits.includes(sample));
  assert.deepEqual(findBans("Arc USDC"), []);
});

test("runtime tree is clean", () => {
  assert.deepEqual(scanRuntime(), []);
});
