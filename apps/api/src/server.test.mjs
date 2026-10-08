import assert from "node:assert/strict";
import test from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createServer } from "./server.mjs";
import { memoryStore } from "./store.mjs";

const owner = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const executorKey = "0x1111111111111111111111111111111111111111111111111111111111111111";
const vaultState = {
  vault: "0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6",
  owner,
  paused: false,
  maxPerTx: 10_000n,
  windowLimit: 50_000n,
  windowSpent: 0n,
  policyVersion: 1n,
  nonce: 1n,
  executor: "0x412045b7c64d471DE57024f11E080289e6082172",
  usdcBalance: 10_000n,
};

function readers(chainId = 5042) {
  return {
    async readChainId() {
      return chainId;
    },
    async factoryHasCode() {
      return true;
    },
    async readVault() {
      return vaultState;
    },
    async readRecipient() {
      return { allowedRecipient: true, blockedRecipient: false };
    },
    async readReceipt() {
      return { exists: false, vault: vaultState.vault, agent: owner, recipient: owner, amount: "0", nonce: "0" };
    },
  };
}

async function boot(extra = {}) {
  const calls = [];
  const app = createServer({
    client: {},
    store: memoryStore(),
    readers: readers(),
    broadcast: async (vault, action) => {
      calls.push({ vault, recipient: action.recipient, amount: action.amount });
      return "0xabc";
    },
    ...extra,
  });
  return { app, calls };
}

test("ready fails when the RPC reports a different chain", async () => {
  const app = createServer({
    client: {},
    store: memoryStore(),
    readers: readers(1),
    broadcast: async () => "0x",
  });
  const res = await app.inject({ method: "GET", url: "/ready" });
  assert.equal(res.statusCode, 503);
  await app.close();
});

test("responses do not contain the executor key", async () => {
  const { app } = await boot();
  const health = await app.inject({ method: "GET", url: "/health" });
  const caps = await app.inject({ method: "GET", url: "/v1/capabilities" });
  const vault = await app.inject({ method: "GET", url: `/v1/vault/${owner}` });
  const body = health.body + caps.body + vault.body;
  assert.equal(body.includes(executorKey), false);
  assert.equal(JSON.parse(caps.body).privacy.executable, false);
  assert.match(vault.body, /0\.01 USDC/);
  await app.close();
});

test("prepare rejects an over-cap amount before any broadcast", async () => {
  const { app, calls } = await boot();
  const account = privateKeyToAccount(generatePrivateKey());
  const challenge = await app.inject({ method: "POST", url: "/v1/auth/challenge", payload: { address: account.address } });
  const message = JSON.parse(challenge.body).message;
  const signature = await account.signMessage({ message });
  const session = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: { address: account.address, signature } });
  const token = JSON.parse(session.body).token;
  const prepared = await app.inject({
    method: "POST",
    url: "/v1/vault/prepare-send",
    headers: { authorization: `Bearer ${token}` },
    payload: { grantId: "1", agent: account.address, recipient: owner, amount: "10001", deadline: "9999999999" },
  });
  assert.equal(prepared.statusCode, 400);
  assert.equal(JSON.parse(prepared.body).error.code, "over_cap");
  assert.equal(calls.length, 0);
  await app.close();
});

test("mcp without a bearer is denied", async () => {
  const { app } = await boot();
  const res = await app.inject({ method: "POST", url: "/mcp", payload: { jsonrpc: "2.0", id: 1, method: "initialize" } });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test("a second submit of the same action does not broadcast again", async () => {
  const { app, calls } = await boot();
  const action = {
    vault: vaultState.vault,
    owner,
    grantId: "1",
    agent: owner,
    actionClass: 1,
    token: "0x3600000000000000000000000000000000000000",
    recipient: owner,
    amount: "1000",
    tokenOut: "0x0000000000000000000000000000000000000000",
    amountOutMin: "0",
    quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: "1",
    deadline: "9999999999",
    policyVersion: "1",
  };
  const account = privateKeyToAccount(generatePrivateKey());
  const signature = await account.signTypedData({
    domain: { name: "Beacon", version: "1", chainId: 5042, verifyingContract: vaultState.vault },
    types: { Action: [
      { name: "grantId", type: "uint256" }, { name: "agent", type: "address" }, { name: "actionClass", type: "uint8" },
      { name: "token", type: "address" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" },
      { name: "tokenOut", type: "address" }, { name: "amountOutMin", type: "uint256" }, { name: "quoteHash", type: "bytes32" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "policyVersion", type: "uint256" },
    ] },
    primaryType: "Action",
    message: { ...action, grantId: 1n, actionClass: 1, amount: 1000n, amountOutMin: 0n, nonce: 1n, deadline: 9999999999n, policyVersion: 1n },
  });
  action.agent = account.address;
  const signed = await account.signTypedData({
    domain: { name: "Beacon", version: "1", chainId: 5042, verifyingContract: vaultState.vault },
    types: { Action: [
      { name: "grantId", type: "uint256" }, { name: "agent", type: "address" }, { name: "actionClass", type: "uint8" },
      { name: "token", type: "address" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" },
      { name: "tokenOut", type: "address" }, { name: "amountOutMin", type: "uint256" }, { name: "quoteHash", type: "bytes32" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "policyVersion", type: "uint256" },
    ] },
    primaryType: "Action",
    message: { grantId: 1n, agent: account.address, actionClass: 1, token: action.token, recipient: owner, amount: 1000n, tokenOut: action.tokenOut, amountOutMin: 0n, quoteHash: action.quoteHash, nonce: 1n, deadline: 9999999999n, policyVersion: 1n },
  });
  const headers = { authorization: "Bearer unused" };
  const store = memoryStore();
  await store.saveSession("session-token", owner, Date.now() + 60_000);
  const app2 = createServer({
    client: {},
    store,
    readers: readers(),
    broadcast: async (vault, sent) => {
      calls.push(sent.recipient);
      return "0xabc";
    },
  });
  const first = await app2.inject({ method: "POST", url: "/v1/vault/execute-send", headers: { authorization: "Bearer session-token" }, payload: { action, signature: signed } });
  const second = await app2.inject({ method: "POST", url: "/v1/vault/execute-send", headers: { authorization: "Bearer session-token" }, payload: { action, signature: signed } });
  assert.equal(first.statusCode, 200);
  assert.equal(JSON.parse(second.body).duplicate, true);
  assert.equal(calls.length, 1);
  void signature;
  void headers;
  await app.close();
  await app2.close();
});
