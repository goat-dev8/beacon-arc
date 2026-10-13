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

test("swap quote is a pinned v3 quoter read and is not executable", async () => {
  const app = createServer({
    client: {},
    store: memoryStore(),
    readers: readers(),
    verifyQuoter: async () => ({ ok: true, factory: "0xf0db7b58379503491d857dB50AC9ece64c653918", tickSpacing: 60, pool: "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1" }),
    quoteSwap: async () => ({ amountIn: "10000", amountOut: "8781", pool: "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1", fee: 500 }),
    broadcast: async () => {
      throw new Error("quote must not broadcast");
    },
  });
  const res = await app.inject({ method: "GET", url: "/v1/quote/swap?amount=10000" });
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.status, "quoted");
  assert.equal(body.venue, "uniswap-v3");
  assert.equal(body.amountOut, "8781");
  assert.equal(body.pool, "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1");
  assert.equal(body.fee, 500);
  assert.equal(body.executable, false);
  assert.match(body.reason, /not a trade/);
  const empty = await app.inject({ method: "GET", url: "/v1/quote/swap?amount=0" });
  assert.equal(empty.statusCode, 400);
  await app.close();
});

test("swap quote falls back to an indicative v2 read when v3 fails", async () => {
  const app = createServer({
    client: {},
    store: memoryStore(),
    readers: readers(),
    verifyQuoter: async () => ({ ok: true }),
    quoteSwap: async () => {
      throw new Error("quoter reverted");
    },
    quoteSwapV2: async () => ({ amountIn: "10000", amountOut: "1460" }),
    broadcast: async () => {
      throw new Error("quote must not broadcast");
    },
  });
  const res = await app.inject({ method: "GET", url: "/v1/quote/swap?amount=10000" });
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.status, "quoted");
  assert.equal(body.venue, "uniswap-v2");
  assert.equal(body.indicative, true);
  assert.equal(body.amountOut, "1460");
  assert.equal(body.executable, false);
  assert.match(body.reason, /indicative/);
  await app.close();
});

test("swap quote is refused when the squat guard fails", async () => {
  const app = createServer({
    client: {},
    store: memoryStore(),
    readers: readers(),
    verifyQuoter: async () => ({ ok: false, reason: "router.factory() mismatch" }),
    quoteSwap: async () => ({ amountIn: "10000", amountOut: "8781" }),
    broadcast: async () => {
      throw new Error("quote must not broadcast");
    },
  });
  const res = await app.inject({ method: "GET", url: "/v1/quote/swap?amount=10000" });
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 503);
  assert.equal(body.status, "UNAVAILABLE");
  assert.equal(body.executable, false);
  assert.match(body.reason, /quoter not pinned/);
  await app.close();
});

const receiptEvent = {
  actionHash: "0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a",
  vault: vaultState.vault,
  agent: owner,
  recipient: owner,
  amount: "10000",
  nonce: "0",
  blockNumber: "24848449",
  txHash: "0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab",
};

test("receipt export requires a session", async () => {
  const { app } = await boot();
  const res = await app.inject({ method: "GET", url: "/v1/receipts/export?format=csv" });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test("receipt export returns a CSV of registry receipts", async () => {
  const store = memoryStore();
  await store.saveSession("session-token", owner, Date.now() + 60_000);
  const app = createServer({
    client: {},
    store,
    readers: readers(),
    readRecordedEvents: async () => [receiptEvent],
    broadcast: async () => "0x",
  });
  const res = await app.inject({
    method: "GET",
    url: "/v1/receipts/export?format=csv",
    headers: { authorization: "Bearer session-token" },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  const lines = res.body.trim().split("\n");
  assert.equal(lines[0], "actionHash,vault,agent,recipient,amount,nonce,blockNumber,txHash");
  assert.equal(lines.length, 2);
  assert.match(lines[1], /0x429b11d6/);
  assert.match(lines[1], /24848449/);
  assert.match(lines[1], /0xa38fb4dc/);
  const bad = await app.inject({
    method: "GET",
    url: "/v1/receipts/export?format=json",
    headers: { authorization: "Bearer session-token" },
  });
  assert.equal(bad.statusCode, 400);
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

async function ownerSession(app, account) {
  const challenge = await app.inject({ method: "POST", url: "/v1/auth/challenge", payload: { address: account.address } });
  const message = JSON.parse(challenge.body).message;
  const signature = await account.signMessage({ message });
  const session = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: { address: account.address, signature } });
  return JSON.parse(session.body).token;
}

test("mcp initialize and tools/list succeed only with a live grant", async () => {
  const { app } = await boot();
  const account = privateKeyToAccount(generatePrivateKey());
  const token = await ownerSession(app, account);
  const granted = await app.inject({
    method: "POST",
    url: "/v1/grants",
    headers: { authorization: `Bearer ${token}` },
    payload: { agent: account.address, maxPerTx: "1000" },
  });
  const bearer = JSON.parse(granted.body).bearer;
  const init = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: { authorization: `Bearer ${bearer}` },
    payload: { jsonrpc: "2.0", id: 1, method: "initialize" },
  });
  assert.equal(init.statusCode, 200);
  assert.equal(JSON.parse(init.body).result.serverInfo.name, "beacon-arc");
  const list = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: { authorization: `Bearer ${bearer}` },
    payload: { jsonrpc: "2.0", id: 2, method: "tools/list" },
  });
  assert.equal(list.statusCode, 200);
  const denied = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: { authorization: `Bearer ${bearer}` },
    payload: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "prepare_send", arguments: { owner, recipient: owner, amount: "1001", grantId: "1", deadline: "9999999999" } },
    },
  });
  assert.match(denied.body, /over_cap/);
  const revoked = await app.inject({
    method: "POST",
    url: "/v1/grants/revoke",
    headers: { authorization: `Bearer ${token}` },
    payload: { bearer },
  });
  assert.equal(revoked.statusCode, 200);
  const after = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: { authorization: `Bearer ${bearer}` },
    payload: { jsonrpc: "2.0", id: 4, method: "initialize" },
  });
  assert.equal(after.statusCode, 401);
  await app.close();
});

test("a mutated amount does not broadcast", async () => {
  const { app, calls } = await boot();
  const store = memoryStore();
  await store.saveSession("session-token", owner, Date.now() + 60_000);
  const app2 = createServer({
    client: {},
    store,
    readers: readers(),
    broadcast: async () => {
      calls.push("broadcast");
      return "0xabc";
    },
  });
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
    message: {
      grantId: 1n, agent: account.address, actionClass: 1,
      token: "0x3600000000000000000000000000000000000000", recipient: owner,
      amount: 1000n, tokenOut: "0x0000000000000000000000000000000000000000", amountOutMin: 0n,
      quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: 1n, deadline: 9999999999n, policyVersion: 1n,
    },
  });
  const res = await app2.inject({
    method: "POST",
    url: "/v1/vault/execute-send",
    headers: { authorization: "Bearer session-token" },
    payload: {
      action: {
        vault: vaultState.vault, owner, grantId: "1", agent: account.address, actionClass: 1,
        token: "0x3600000000000000000000000000000000000000", recipient: owner, amount: "1001",
        nonce: "1", deadline: "9999999999", policyVersion: "1",
      },
      signature,
    },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error.code, "bad_signature");
  assert.equal(calls.length, 0);
  await app.close();
  await app2.close();
});

test("grants rejects an invalid agent address", async () => {
  const store = memoryStore();
  await store.saveSession("session-token", owner, Date.now() + 60_000);
  const app = createServer({ client: {}, store, readers: readers(), broadcast: async () => "0x" });
  const res = await app.inject({
    method: "POST",
    url: "/v1/grants",
    headers: { authorization: "Bearer session-token" },
    payload: { agent: "not-an-address" },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error.code, "agent");
  await app.close();
});

test("auth verify returns 401 on a malformed address instead of 500", async () => {
  const { app } = await boot();
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/verify",
    payload: { address: "0xzzz", signature: "0x1234" },
  });
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).error.code, "address");
  await app.close();
});

test("capabilities distinguish V1 send-only from V2 swap execution", async () => {
  const { app } = await boot();
  const res = await app.inject({ method: "GET", url: "/v1/capabilities" });
  assert.equal(res.statusCode, 200);
  const caps = JSON.parse(res.body);
  // Top-level stays V1-scoped for back-compat.
  assert.equal(caps.swap.executable, false);
  assert.match(caps.swap.reason, /V1.*send-only/);
  // V2 detail: swap IS executable with the real proof.
  assert.equal(caps.swap.v2.executable, true);
  assert.equal(caps.swap.v2.vault, "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe");
  assert.equal(caps.swap.v2.proof.txHash, "0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d");
  // CCTP stays honest: chain-gated, not executable, not hidden.
  assert.equal(caps.cctp.executable, false);
  assert.match(caps.cctp.reason, /chain/);
  assert.ok(!/bridge complete|executed successfully/.test(caps.cctp.reason));
  await app.close();
});

test("v2 info endpoint returns V2 addresses and real proofs", async () => {
  const { app } = await boot();
  const res = await app.inject({ method: "GET", url: "/v1/v2/info" });
  assert.equal(res.statusCode, 200);
  const info = JSON.parse(res.body);
  assert.equal(info.chainId, 5042);
  assert.equal(info.contracts.vault, "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe");
  assert.equal(info.contracts.factory, "0xa7c95a58b499ed4dc607e6e7030cece2b00fab6e");
  assert.equal(info.contracts.registry, "0xcecb08b2cdacaf231b1838f20f932ad265fa2583");
  assert.equal(info.proofs.swap.txHash, "0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d");
  assert.equal(info.proofs.send.txHash, "0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc");
  assert.equal(info.proofs.bridge.status, "chain-gated");
  await app.close();
});

const v2owner = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const granted = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";
const payee = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";

function v2Deps(extra = {}) {
  const calls = [];
  const snapshot = {
    vault: "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe",
    owner: v2owner,
    paused: false,
    maxPerTx: 10000n,
    windowLimit: 50000n,
    windowSpent: 0n,
    nonce: 4n,
    policyVersion: 1n,
    usdc: "0x3600000000000000000000000000000000000000",
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    grant: { agent: granted, maxPerTx: 10000n, expiry: 1794515414n, scopes: 7, active: true },
  };
  return {
    calls,
    app: createServer({
      client: {},
      store: memoryStore(),
      readers: readers(),
      broadcast: async () => "0xabc",
      loadV2: async () => snapshot,
      loadRecipient: async () => ({ allowed: true, blocked: false }),
      loadTokenOut: async () => true,
      quoteSwap: async () => ({ amountIn: "5000", amountOut: "4463", fee: 500 }),
      agentAddress: granted,
      signAgentAction: async () => "0xsig",
      broadcastV2: async (_vault, fn, action) => {
        calls.push({ fn, amount: action.amount.toString() });
        return "0x" + "ab".repeat(32);
      },
      now: () => 1_700_000_000,
      ...extra,
    }),
  };
}

test("agent send preview does not broadcast", async () => {
  const { app, calls } = v2Deps();
  const res = await app.inject({ method: "POST", url: "/v1/agent/send", payload: { recipient: payee, amount: "1000" } });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.status, "preview");
  assert.equal(body.action.amount, "1000");
  assert.equal(body.action.recipient, payee);
  assert.equal(body.action.actionClass, 1);
  assert.equal(calls.length, 0);
  await app.close();
});

test("agent send above the dust cap is refused and does not sign", async () => {
  const { app, calls } = v2Deps();
  const res = await app.inject({ method: "POST", url: "/v1/agent/send", payload: { recipient: payee, amount: "10001", confirm: true } });
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error.code, "OverCap");
  assert.equal(calls.length, 0);
  await app.close();
});

test("agent send confirm without a session does not broadcast", async () => {
  const { app, calls } = v2Deps();
  const res = await app.inject({ method: "POST", url: "/v1/agent/send", payload: { recipient: payee, amount: "1000", confirm: true } });
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
  await app.close();
});

test("agent send confirm with the owner session relays once", async () => {
  const store = memoryStore();
  const token = "owner-session-token";
  await store.saveSession(token, v2owner, Date.now() + 60_000);
  const { app, calls } = v2Deps({ store });
  const res = await app.inject({
    method: "POST",
    url: "/v1/agent/send",
    headers: { authorization: `Bearer ${token}` },
    payload: { recipient: payee, amount: "1000", confirm: true },
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.status, "submitted");
  assert.match(body.txHash, /^0x[0-9a-f]{64}$/);
  assert.match(body.verifyUrl, /^\/verify\/0x/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fn, "executeSend");
  assert.equal(calls[0].amount, "1000");
  await app.close();
});

test("a missing agent key reports the console unavailable", async () => {
  const { app } = v2Deps({ signAgentAction: null, broadcastV2: null });
  const status = await app.inject({ method: "GET", url: "/v1/agent/status" });
  assert.equal(JSON.parse(status.body).ready, false);
  await app.close();
});
