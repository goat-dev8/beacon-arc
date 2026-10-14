import assert from "node:assert/strict";
import test from "node:test";
import { refusedArcPath } from "./refusedPaths.ts";

test("legacy job, chat, tee, and swap routes are refused", () => {
  assert.equal(refusedArcPath("/v1/jobs"), true);
  assert.equal(refusedArcPath("/v1/jobs/abc/approve"), true);
  assert.equal(refusedArcPath("/v1/agents/chat"), true);
  assert.equal(refusedArcPath("/v1/tee/status"), true);
  assert.equal(refusedArcPath("/v1/vault/prepare"), true);
  assert.equal(refusedArcPath("/v1/vault/safe-swap/execute"), true);
  assert.equal(refusedArcPath("/v1/bridge/status?txHash=0x1"), true);
  assert.equal(refusedArcPath("/v1/flow/activity"), true);
  assert.equal(refusedArcPath("/v1/mcp/grants"), true);
});

test("Arc liveness routes are not refused by this guard", () => {
  assert.equal(refusedArcPath("/health"), false);
  assert.equal(refusedArcPath("/ready"), false);
  assert.equal(refusedArcPath("/v1/verify/0xabc"), false);
  assert.equal(refusedArcPath("/mcp"), false);
  assert.equal(refusedArcPath("/v1/chats"), false);
  assert.equal(refusedArcPath("/v1/chats/abc"), false);
});
