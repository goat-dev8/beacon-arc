import assert from "node:assert/strict";
import test from "node:test";
import {
  V2_BRIDGE_STATUS,
  V2_DEPLOYMENTS,
  V2_EXPLORER_TX,
  V2_SEND_PROOF,
  V2_SOURCIFY,
  V2_SWAP_PROOF,
} from "./v2Proofs.ts";

const ADDR = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;

test("V2 contract addresses are exact", () => {
  const byName = Object.fromEntries(V2_DEPLOYMENTS.map((c) => [c.name, c.address]));
  assert.equal(byName["BeaconUsdcVaultV2"], "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe");
  assert.equal(byName["BeaconVaultFactoryV2"], "0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e");
  assert.equal(byName["BeaconReceiptRegistry"], "0xcecb08b2cdacaf231b1838f20f932ad265fa2583");
  for (const c of V2_DEPLOYMENTS) assert.match(c.address, ADDR, c.name);
});

test("swap proof carries the real on-chain execution", () => {
  assert.match(V2_SWAP_PROOF.txHash, HASH);
  assert.equal(V2_SWAP_PROOF.txHash, "0xf4c87b61812858d5e4381f328b19ad27eb8db4004b8a9432a1936f1df26ddd0c");
  assert.equal(V2_SWAP_PROOF.block, "25808007");
  assert.match(V2_SWAP_PROOF.amountOut, /4,463/);
  assert.ok(V2_SWAP_PROOF.labels.includes("agent-signed"));
  assert.ok(V2_SWAP_PROOF.labels.includes("executor-relayed"));
});

test("send proof carries the real on-chain execution", () => {
  assert.match(V2_SEND_PROOF.txHash, HASH);
  assert.equal(V2_SEND_PROOF.txHash, "0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc");
  assert.match(V2_SEND_PROOF.to, ADDR);
});

test("bridge status is honest: chain-gated, never presented as executed", () => {
  assert.equal(V2_BRIDGE_STATUS.status, "chain-gated");
  const text = `${V2_BRIDGE_STATUS.title} ${V2_BRIDGE_STATUS.body} ${V2_BRIDGE_STATUS.limitation}`.toLowerCase();
  assert.ok(text.includes("chain"), "must name the chain-level limitation");
  assert.ok(!text.includes("executed successfully"), "must not claim a successful bridge");
  assert.ok(!text.includes("bridge complete"), "must not claim a completed bridge");
  assert.match(V2_BRIDGE_STATUS.eoaProof.txHash, HASH);
});

test("explorer and Sourcify link builders point at Arc mainnet", () => {
  assert.equal(
    V2_EXPLORER_TX(V2_SWAP_PROOF.txHash),
    `https://explorer.arc.io/tx/${V2_SWAP_PROOF.txHash}`,
  );
  assert.equal(
    V2_SOURCIFY(V2_DEPLOYMENTS[0].address),
    `https://repo.sourcify.dev/5042/${V2_DEPLOYMENTS[0].address}`,
  );
});
