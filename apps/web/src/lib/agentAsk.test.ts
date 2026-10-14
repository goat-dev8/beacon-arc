import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentAsk } from "./agentAsk.ts";

test("swap 0.001 is a dust swap even without the word USDC", () => {
  assert.deepEqual(parseAgentAsk("swap 0.001"), { kind: "swap", amount: "1000" });
});

test("swap 0.005 USDC to EURC is 5000 base units", () => {
  assert.deepEqual(parseAgentAsk("swap 0.005 USDC to EURC"), { kind: "swap", amount: "5000" });
});

test("a send names the recipient when one is present", () => {
  const ask = parseAgentAsk("send 0.001 USDC to 0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd");
  assert.equal(ask?.kind, "send");
  if (ask?.kind === "send") {
    assert.equal(ask.amount, "1000");
    assert.equal(ask.recipient, "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd");
  }
});

test("bridge and privacy stay out of the agent path", () => {
  assert.equal(parseAgentAsk("bridge to Base"), null);
  assert.equal(parseAgentAsk("Is private settlement on?"), null);
});

test("an over-cap question is a revert, not a send", () => {
  assert.deepEqual(parseAgentAsk("What happens if a send is over the cap?"), { kind: "revert" });
});
