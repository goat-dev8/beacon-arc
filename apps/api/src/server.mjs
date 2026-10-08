import Fastify from "fastify";
import { verifyMessage } from "viem";
import { CAPABILITIES, CHAIN_ID, FACTORY } from "./constants.mjs";
import { actionHash, recoverAgent, sendTypedData } from "./eip712.mjs";
import { preflightSend } from "./preflight.mjs";
import { factoryHasCode, readChainId, readReceipt, readRecipient, readVault } from "./chain.mjs";
import { newBearer } from "./store.mjs";

const ZERO = "0x0000000000000000000000000000000000000000";

export function createServer(deps) {
  const readers = deps.readers ?? { readChainId, factoryHasCode, readVault, readRecipient, readReceipt };
  const app = Fastify({ logger: false });
  app.addHook("onSend", async (_req, reply) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-headers", "content-type, authorization");
  });
  app.options("/*", async (_req, reply) => reply.code(204).send());

  app.get("/health", async () => ({ ok: true }));

  app.get("/ready", async (_req, reply) => {
    try {
      const chainId = await readers.readChainId(deps.client);
      const code = await readers.factoryHasCode(deps.client, deps.factory ?? FACTORY);
      const db = await deps.store.ping();
      if (chainId !== CHAIN_ID || !code || !db) {
        return reply.code(503).send({ ok: false, chainId, factoryCode: code, db });
      }
      return { ok: true, chainId };
    } catch (error) {
      return reply.code(503).send({ ok: false, error: error.message });
    }
  });

  app.get("/v1/capabilities", async () => CAPABILITIES);

  app.get("/v1/vault/:owner", async (req, reply) => {
    const vault = await readers.readVault(deps.client, req.params.owner);
    if (!vault) return reply.code(404).send({ error: { code: "no_vault", message: "This owner has no vault." } });
    return jsonVault(vault);
  });

  app.get("/v1/verify/:actionHash", async (req, reply) => {
    const receipt = await readers.readReceipt(deps.client, req.params.actionHash);
    if (!receipt.exists) {
      return reply.code(404).send({ error: { code: "no_receipt", message: "No on-chain receipt for this action." } });
    }
    return {
      actionHash: req.params.actionHash,
      status: "recorded",
      vault: receipt.vault,
      agent: receipt.agent,
      recipient: receipt.recipient,
      amount: receipt.amount,
      nonce: receipt.nonce,
      explorer: `https://explorer.arc.io/address/${receipt.vault}`,
    };
  });

  app.post("/v1/auth/challenge", async (req, reply) => {
    const address = req.body?.address;
    if (!address) return reply.code(400).send({ error: { code: "address", message: "Address is required." } });
    const nonce = newBearer();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await deps.store.saveChallenge(address, nonce, expiresAt);
    return { message: `Beacon Arc login ${nonce}`, expiresAt };
  });

  app.post("/v1/auth/verify", async (req, reply) => {
    const { address, signature } = req.body ?? {};
    const nonce = await deps.store.takeChallenge(address ?? "");
    if (!nonce) return reply.code(401).send({ error: { code: "challenge", message: "Challenge expired." } });
    const message = `Beacon Arc login ${nonce}`;
    const ok = await verifyMessage({ address, message, signature });
    if (!ok) return reply.code(401).send({ error: { code: "signature", message: "Signature does not match this address." } });
    const token = newBearer();
    await deps.store.saveSession(token, address, Date.now() + 12 * 60 * 60 * 1000);
    return { token };
  });

  app.post("/v1/grants", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    const vault = await readers.readVault(deps.client, owner);
    if (!vault) return reply.code(404).send({ error: { code: "no_vault", message: "This owner has no vault." } });
    const max = BigInt(req.body?.maxPerTx ?? vault.maxPerTx);
    if (max > vault.maxPerTx) {
      return reply.code(400).send({ error: { code: "over_cap", message: "Grant cap cannot exceed the vault policy." } });
    }
    const bearer = newBearer();
    await deps.store.saveGrant({
      id: newBearer(),
      vault: vault.vault,
      agent: req.body.agent,
      bearer,
      scopes: "send",
      maxPerTx: max,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      revoked: false,
    });
    return { bearer, scopes: ["send"], maxPerTx: max.toString() };
  });

  app.post("/v1/vault/prepare-send", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    return prepare(deps, readers, owner, req.body, reply);
  });

  app.post("/v1/vault/execute-send", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    return submit(deps, readers, req.body?.action, req.body?.signature, reply);
  });

  app.post("/mcp", async (req, reply) => handleMcp(deps, req, reply));

  return app;
}

async function sessionOwner(deps, req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return deps.store.readSession(token);
}

async function prepare(deps, readers, owner, body, reply) {
  const vault = await readers.readVault(deps.client, owner);
  if (!vault) return reply.code(404).send({ error: { code: "no_vault", message: "This owner has no vault." } });
  const typed = sendTypedData(vault.vault, {
    grantId: body.grantId,
    agent: body.agent,
    recipient: body.recipient,
    amount: body.amount,
    nonce: vault.nonce.toString(),
    deadline: body.deadline,
    policyVersion: vault.policyVersion.toString(),
  });
  const action = typed.message;
  const gate = await gateAction(deps, readers, vault, action);
  if (!gate.ok) return reply.code(400).send({ error: { code: gate.reason, message: human(gate.reason) } });
  return {
    summary: humanAmount(action.amount, action.recipient),
    typedData: typed,
    note: "The agent signs this. The API does not.",
  };
}

async function submit(deps, readers, action, signature, reply) {
  if (!action || !signature) {
    return reply.code(400).send({ error: { code: "signature", message: "A signed action is required." } });
  }
  const hash = actionHash(action.vault ?? action.verifyingContract, normalize(action));
  const vaultAddress = action.vault;
  const existing = await deps.store.getAction(hash);
  if (existing) return { actionHash: hash, txHash: existing, duplicate: true };
  let signer;
  try {
    signer = await recoverAgent(vaultAddress, normalize(action), signature);
  } catch {
    return reply.code(400).send({ error: { code: "bad_signature", message: "The signature does not match this action." } });
  }
  if (signer.toLowerCase() !== action.agent.toLowerCase()) {
    return reply.code(400).send({ error: { code: "bad_signature", message: "The signer is not the agent on this action." } });
  }
  const vault = await readers.readVault(deps.client, action.owner);
  if (!vault || vault.vault.toLowerCase() !== vaultAddress.toLowerCase()) {
    return reply.code(400).send({ error: { code: "vault", message: "Vault does not match the owner." } });
  }
  const gate = await gateAction(deps, readers, vault, normalize(action));
  if (!gate.ok) return reply.code(400).send({ error: { code: gate.reason, message: human(gate.reason) } });
  const txHash = await deps.broadcast(vaultAddress, normalize(action), signature);
  await deps.store.saveAction(hash, txHash);
  return { actionHash: hash, txHash, duplicate: false };
}

async function gateAction(deps, readers, vault, action) {
  const recipient = await readers.readRecipient(deps.client, vault.vault, action.recipient);
  const now = Math.floor(Date.now() / 1000);
  return preflightSend(
    { ...action, amount: BigInt(action.amount), nonce: BigInt(action.nonce), deadline: BigInt(action.deadline), policyVersion: BigInt(action.policyVersion) },
    {
      paused: vault.paused,
      maxPerTx: vault.maxPerTx,
      windowLimit: vault.windowLimit,
      windowSpent: vault.windowSpent,
      policyVersion: vault.policyVersion,
      nonce: vault.nonce,
      allowedRecipient: recipient.allowedRecipient,
      blockedRecipient: recipient.blockedRecipient,
    },
    BigInt(now),
  );
}

function normalize(action) {
  return {
    grantId: action.grantId,
    agent: action.agent,
    actionClass: Number(action.actionClass),
    token: action.token,
    recipient: action.recipient,
    amount: action.amount,
    tokenOut: action.tokenOut ?? ZERO,
    amountOutMin: action.amountOutMin ?? "0",
    quoteHash: action.quoteHash ?? "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: action.nonce,
    deadline: action.deadline,
    policyVersion: action.policyVersion,
  };
}

function jsonVault(vault) {
  const amount = vault.usdcBalance;
  return {
    vault: vault.vault,
    owner: vault.owner,
    paused: vault.paused,
    summary: `${formatUsdc(amount)} USDC in the vault`,
    maxPerTx: vault.maxPerTx.toString(),
    windowLimit: vault.windowLimit.toString(),
    windowSpent: vault.windowSpent.toString(),
    policyVersion: vault.policyVersion.toString(),
    nonce: vault.nonce.toString(),
    usdcBalance: amount.toString(),
    executor: vault.executor,
    capabilities: CAPABILITIES,
  };
}

function formatUsdc(base) {
  const whole = base / 1_000_000n;
  const frac = (base % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}.00`;
}

function humanAmount(amount, recipient) {
  return `Send ${formatUsdc(BigInt(amount))} USDC to ${recipient}`;
}

function human(reason) {
  const text = {
    over_cap: "This amount is above the policy cap.",
    over_window: "This amount is above the remaining window.",
    recipient: "This recipient is not allowed.",
    paused: "The vault is paused.",
    policy: "The policy changed after this action was prepared.",
    nonce: "This action is stale.",
    expired: "This action deadline has passed.",
    token: "Only USDC sends are enabled.",
    scope: "This action class is not enabled.",
  };
  return text[reason] ?? "Denied.";
}

async function handleMcp(deps, req, reply) {
  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const body = req.body ?? {};
  const id = body.id ?? null;
  if (!bearer) return reply.code(401).send({ jsonrpc: "2.0", id, error: { code: -32001, message: "Bearer required." } });
  const grant = await deps.store.readGrant(bearer);
  if (!grant) return reply.code(401).send({ jsonrpc: "2.0", id, error: { code: -32001, message: "Grant revoked or expired." } });
  if (body.method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "beacon-arc", version: "1" } } };
  }
  if (body.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          { name: "capabilities", description: "What Beacon can execute on Arc today.", inputSchema: { type: "object", properties: {} } },
          { name: "get_vault", description: "Read the owner vault from Arc.", inputSchema: { type: "object", properties: { owner: { type: "string" } }, required: ["owner"] } },
          { name: "prepare_send", description: "Return EIP-712 data for the agent to sign. Does not move USDC.", inputSchema: { type: "object", properties: { owner: { type: "string" }, recipient: { type: "string" }, amount: { type: "string" }, grantId: { type: "string" }, deadline: { type: "string" } }, required: ["owner", "recipient", "amount", "grantId", "deadline"] } },
          { name: "submit_signed_send", description: "Relay a signature. Cannot change the signed fields.", inputSchema: { type: "object", properties: { action: { type: "object" }, signature: { type: "string" } }, required: ["action", "signature"] } },
        ],
      },
    };
  }
  if (body.method === "tools/call") {
    const name = body.params?.name;
    const args = body.params?.arguments ?? {};
    if (name === "capabilities") return toolResult(id, CAPABILITIES);
    if (name === "get_vault") {
      const vault = await readers.readVault(deps.client, args.owner);
      if (!vault) return toolResult(id, { error: "no_vault" });
      return toolResult(id, jsonVault(vault));
    }
    if (name === "prepare_send") {
      const vault = await readers.readVault(deps.client, args.owner);
      if (!vault || vault.vault.toLowerCase() !== grant.vault.toLowerCase()) return toolResult(id, { error: "vault" });
      if (BigInt(args.amount) > grant.maxPerTx) return toolResult(id, { error: "over_cap" });
      const typed = sendTypedData(vault.vault, {
        grantId: args.grantId,
        agent: grant.agent,
        recipient: args.recipient,
        amount: args.amount,
        nonce: vault.nonce.toString(),
        deadline: args.deadline,
        policyVersion: vault.policyVersion.toString(),
      });
      return toolResult(id, { summary: humanAmount(args.amount, args.recipient), typedData: typed, note: "Sign this with the agent key. Beacon does not have that key." });
    }
    if (name === "submit_signed_send") {
      if (args.action?.agent?.toLowerCase() !== grant.agent.toLowerCase()) return toolResult(id, { error: "agent" });
      const fakeReply = { code() { return this; }, send(body) { this.body = body; return body; }, body: null };
      const result = await submit(deps, readers, { ...args.action, owner: args.action.owner }, args.signature, fakeReply);
      return toolResult(id, fakeReply.body ?? result);
    }
    return toolResult(id, { error: "unknown_tool" });
  }
  return reply.code(400).send({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found." } });
}

function toolResult(id, data) {
  return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(data) }] } };
}
