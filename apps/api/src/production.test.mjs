import assert from "node:assert/strict";
import test from "node:test";

const API = "https://beacon-arc-api.onrender.com";
const WEB = "https://beacon-arc-one.vercel.app";
const OWNER = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const VAULT = "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe";
const ARC_RPC = "https://rpc.mainnet.arc.io";
const USDC = "0x3600000000000000000000000000000000000000";

async function get(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  return { status: res.status, text, json: text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : null };
}

// The vault balance is live chain state (it changes when the vault is funded),
// so compare the API's report against an independent RPC read instead of a
// hard-coded value. Verified 2026-10-13: balance moved 10000 -> 50000 raw
// (0.01 -> 0.05 USDC) after a real funding; the API tracked it correctly.
async function rpcBalanceOf(vault) {
  const res = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: USDC, data: "0x70a08231000000000000000000000000" + vault.slice(2) }, "latest"],
    }),
  });
  const json = await res.json();
  return BigInt(json.result).toString();
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
  assert.equal(vault.json.usdcBalance, await rpcBalanceOf(VAULT));
  assert.match(vault.json.summary, / USDC in the vault/);

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
