import assert from "node:assert/strict";
import test from "node:test";
import { preflightSend } from "./preflight.mjs";
import { ARC_USDC } from "./constants.mjs";

const vault = {
  paused: false,
  maxPerTx: 10_000n,
  windowLimit: 50_000n,
  windowSpent: 0n,
  policyVersion: 1n,
  nonce: 0n,
  allowedRecipient: true,
  blockedRecipient: false,
};

const action = {
  actionClass: 1,
  token: ARC_USDC,
  tokenOut: "0x0000000000000000000000000000000000000000",
  amount: 5_000n,
  policyVersion: 1n,
  nonce: 0n,
  deadline: 10_000n,
};

test("preflight rejects an amount above the cap", () => {
  const result = preflightSend({ ...action, amount: 10_001n }, vault, 100n);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "over_cap");
});

test("preflight rejects a recipient the policy does not allow", () => {
  const result = preflightSend(action, { ...vault, allowedRecipient: false }, 100n);
  assert.equal(result.reason, "recipient");
});

test("preflight accepts a payment inside the cap", () => {
  assert.equal(preflightSend(action, vault, 100n).ok, true);
});
