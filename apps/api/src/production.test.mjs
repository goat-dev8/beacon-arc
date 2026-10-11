import assert from "node:assert/strict";
import test from "node:test";

const API = "https://beacon-arc-api.onrender.com";
const WEB = "https://beacon-arc-one.vercel.app";
const OWNER = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const VAULT = "0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6";

async function get(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  return { status: res.status, text, json: text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : null };
}

test("production API reports Arc and the live vault", async () => {
  const health = await get(`${API}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);

  const ready = await get(`${API}/ready`);
  assert.equal(ready.status, 200);
  assert.equal(ready.json.chainId, 5042);

  const vault = await get(`${API}/v1/vault/${OWNER}`);
  assert.equal(vault.status, 200);
  assert.equal(vault.json.vault.toLowerCase(), VAULT.toLowerCase());
  assert.equal(vault.json.usdcBalance, "10000");
  assert.match(vault.json.summary, /0\.01 USDC/);

  const caps = await get(`${API}/v1/capabilities`);
  assert.equal(caps.json.send.executable, true);
  for (const name of ["swap", "cctp", "privacy", "pq", "x402", "erc8004"]) {
    assert.equal(caps.json[name].executable, false, name);
  }
});

test("production MCP rejects a caller with no bearer", async () => {
  const res = await get(`${API}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
  });
  assert.equal(res.status, 401);
});

test("production login challenge does not include a transaction hash", async () => {
  const res = await get(`${API}/v1/auth/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: OWNER }),
  });
  assert.equal(res.status, 200);
  assert.match(res.json.message, /^Beacon Arc login /);
  assert.equal(res.json.txHash, undefined);
});

test("production desk shell is the Arc firewall", async () => {
  const res = await get(`${WEB}/flow/desk`);
  assert.equal(res.status, 200);
  assert.match(res.text, /Beacon — Arc USDC firewall/);
  assert.match(res.text, /The agent signs a payment/);
  assert.doesNotMatch(res.text, /Escrow AI jobs/);
});
