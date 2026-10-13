import assert from "node:assert/strict";
import test from "node:test";
import { checkRevertDemo, checkSend, checkSwap, quoteHashOf, rateAllow, SEND_CAP, slippageFloor } from "./agentTask.mjs";

const agent = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";
const recipient = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";
const grant = { agent, maxPerTx: 10000n, expiry: 1794515414n, scopes: 7, active: true };
const base = {
  paused: false,
  allowed: true,
  blocked: false,
  grant,
  maxPerTx: 10000n,
  windowLimit: 50000n,
  windowSpent: 0n,
  now: 1_700_000_000,
};

test("a dust send to an allowlisted recipient passes", () => {
  const gate = checkSend({ ...base, amount: "1000", recipient });
  assert.equal(gate.ok, true);
  assert.equal(gate.amount, 1000n);
});

test("a send above the dust cap is refused before any signature", () => {
  const gate = checkSend({ ...base, amount: "1001", recipient });
  assert.equal(gate.ok, false);
  assert.equal(gate.code, "dust_cap");
  assert.match(gate.message, new RegExp(String(SEND_CAP)));
});

test("a send above the vault cap is OverCap", () => {
  const gate = checkSend({ ...base, amount: "10001", recipient });
  assert.equal(gate.code, "OverCap");
});

test("an unknown recipient is RecipientNotAllowed", () => {
  const gate = checkSend({ ...base, amount: "1000", recipient, allowed: false });
  assert.equal(gate.code, "RecipientNotAllowed");
});

test("an expired grant is GrantExpired", () => {
  const gate = checkSend({ ...base, amount: "1000", recipient, now: 2_000_000_000n });
  assert.equal(gate.code, "GrantExpired");
});

test("a paused vault is refused", () => {
  const gate = checkSend({ ...base, amount: "1000", recipient, paused: true });
  assert.equal(gate.code, "paused");
});

test("a swap inside the dust cap with swap scope passes", () => {
  const gate = checkSwap({ ...base, amount: "5000", tokenOutAllowed: true });
  assert.equal(gate.ok, true);
});

test("a swap without swap scope is ScopeDenied", () => {
  const gate = checkSwap({ ...base, amount: "1000", tokenOutAllowed: true, grant: { ...grant, scopes: 1 } });
  assert.equal(gate.code, "ScopeDenied");
});

test("the revert demo only accepts a dust amount above the cap", () => {
  assert.equal(checkRevertDemo({ amount: "1000", maxPerTx: 10000n, recipient, allowed: true }).code, "not_over_cap");
  assert.equal(checkRevertDemo({ amount: "10001", maxPerTx: 10000n, recipient, allowed: true }).ok, true);
  assert.equal(checkRevertDemo({ amount: "100000", maxPerTx: 10000n, recipient, allowed: true }).code, "dust_cap");
});

test("rate limit closes after the budget", () => {
  const bucket = new Map();
  assert.equal(rateAllow(bucket, "a", 2, 1000, 10), true);
  assert.equal(rateAllow(bucket, "a", 2, 1000, 20), true);
  assert.equal(rateAllow(bucket, "a", 2, 1000, 30), false);
  assert.equal(rateAllow(bucket, "a", 2, 1000, 2000), true);
});

test("slippage floor is 1 percent under the quote", () => {
  assert.equal(slippageFloor(4463n), 4418n);
  assert.match(quoteHashOf({ amountOut: "4463" }), /^0x[0-9a-f]{64}$/);
});
