import Fastify from "fastify";
import { isAddress, verifyMessage } from "viem";
import { CAPABILITIES, CHAIN_ID, FACTORY } from "./constants.mjs";
import { actionHash, actionHashV2, recoverAgent, sendTypedData } from "./eip712.mjs";
import { checkRevertDemo, checkSend, checkSwap, quoteHashOf, rateAllow, slippageFloor } from "./agentTask.mjs";
import { loadRecipient, loadTokenOut, loadV2 } from "./agentChain.mjs";
import { preflightSend } from "./preflight.mjs";
import { factoryHasCode, quoteV2, quoteV3, readChainId, readReceipt, readRecipient, readRecordedEvents, readVault, verifyQuoterPinned } from "./chain.mjs";
import { V3_USDC_EURC_500, V3_FEE, V3_QUOTER, V3_ROUTER02 } from "./constants.mjs";
import {
  ARC_EURC,
  ARC_USDC,
  CCTP_MESSENGER_V2,
  V2_FACTORY,
  V2_REGISTRY,
  V2_VAULT,
} from "./constants.mjs";
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

  // Beacon V2: live contracts plus the real on-chain execution proofs.
  // V1 stays live and untouched; this endpoint is additive.
  app.get("/v1/v2/info", async () => ({
    network: "arc-mainnet",
    chainId: CHAIN_ID,
    contracts: {
      vault: V2_VAULT,
      factory: V2_FACTORY,
      registry: V2_REGISTRY,
    },
    pins: {
      usdc: ARC_USDC,
      eurc: ARC_EURC,
      swapRouter: V3_ROUTER02,
      usdcEurcPool: V3_USDC_EURC_500,
      swapFee: V3_FEE,
      tokenMessenger: CCTP_MESSENGER_V2,
    },
    proofs: {
      swap: {
        txHash: "0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d",
        block: "25818567",
        amountIn: "5000",
        amountOut: "4463",
        detail: "0.005 USDC -> 4,463 EURC base units, agent-signed + executor-relayed",
      },
      send: {
        txHash: "0x0b45709e65921deda6854e394a5a03ec855d3fa9e8ffa80d0d169d8b625583bc",
        detail: "0.001 USDC, agent-signed + executor-relayed",
      },
      bridge: {
        status: "chain-gated",
        detail: "V2 bridge code is correct (7-parameter CCTP V2 depositForBurn, 42/42 forge tests) but Arc's CCTP TokenMessenger rejects contract-initiated burns — a chain-level limitation, not a Beacon bug.",
        eoaBurnTx: "0xe519221e1c1d7b1c6225f22c1bd6bba9e76d1bb77fc467cf78fd1eace23731f1",
      },
    },
  }));

  // Startup squat-guard for the pinned v3 quoter. Runs once, result cached;
  // the quote endpoint refuses to serve while the pin is not verified.
  let quoterPinPromise = null;
  async function quoterPin() {
    if (!quoterPinPromise) {
      quoterPinPromise = (async () => {
        try {
          const pin = await (deps.verifyQuoter ?? verifyQuoterPinned)(deps.client);
          console.log(`[quoter] pin check ${pin.ok ? "OK" : "FAIL"} factory=${pin.factory} tickSpacing=${pin.tickSpacing} pool=${pin.pool}`);
          return pin;
        } catch (error) {
          console.log(`[quoter] pin check error: ${error.message}`);
          return { ok: false, reason: error.message };
        }
      })();
    }
    return quoterPinPromise;
  }

  app.get("/v1/quote/swap", async (req, reply) => {
    const amount = String(req.query?.amount ?? "10000");
    if (!/^\d+$/.test(amount) || BigInt(amount) === 0n) {
      return reply.code(400).send({ error: { code: "amount", message: "Amount must be a positive base-unit integer." } });
    }
    const pin = await quoterPin();
    if (!pin.ok) {
      return reply.code(503).send({
        status: "UNAVAILABLE",
        venue: "uniswap-v3",
        amountIn: amount,
        executable: false,
        reason: `quoter not pinned: ${pin.reason}`,
      });
    }
    try {
      const quote = await (deps.quoteSwap ?? quoteV3)(deps.client, amount);
      if (!quote.amountOut || quote.amountOut === "0") {
        return { status: "NO_ROUTE", venue: "uniswap-v3", amountIn: amount, executable: false, reason: "The quoter returned no output." };
      }
      return {
        status: "quoted",
        venue: "uniswap-v3",
        quoter: V3_QUOTER,
        router: V3_ROUTER02,
        pool: quote.pool ?? V3_USDC_EURC_500,
        fee: quote.fee ?? V3_FEE,
        tokenIn: "0x3600000000000000000000000000000000000000",
        tokenOut: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        executable: false,
        reason: "This quote is not a trade. The live vault swaps only after the owner confirms an agent-signed executeSwap.",
      };
    } catch (error) {
      try {
        const fallback = await (deps.quoteSwapV2 ?? quoteV2)(deps.client, amount);
        if (!fallback.amountOut || fallback.amountOut === "0") {
          return { status: "NO_ROUTE", venue: "uniswap-v2", amountIn: amount, executable: false, reason: "No route on either venue." };
        }
        return {
          status: "quoted",
          venue: "uniswap-v2",
          indicative: true,
          tokenIn: "0x3600000000000000000000000000000000000000",
          tokenOut: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
          amountIn: fallback.amountIn,
          amountOut: fallback.amountOut,
          executable: false,
          reason: `The v3 quoter failed (${error.message}). This v2 router read is indicative only and is not a trade.`,
        };
      } catch {
        return { status: "NO_ROUTE", venue: "uniswap-v3", amountIn: amount, executable: false, reason: error.message };
      }
    }
  });

  app.get("/v1/receipts/export", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    const format = String(req.query?.format ?? "csv");
    if (format !== "csv") {
      return reply.code(400).send({ error: { code: "format", message: "Only format=csv is supported." } });
    }
    const vaultFilter = req.query?.vault ? String(req.query.vault) : undefined;
    const fromBlock = req.query?.fromBlock ? String(req.query.fromBlock) : undefined;
    const toBlock = req.query?.toBlock ? String(req.query.toBlock) : undefined;
    if (fromBlock !== undefined && !/^\d+$/.test(fromBlock)) {
      return reply.code(400).send({ error: { code: "fromBlock", message: "fromBlock must be a block number." } });
    }
    if (toBlock !== undefined && !/^\d+$/.test(toBlock)) {
      return reply.code(400).send({ error: { code: "toBlock", message: "toBlock must be a block number." } });
    }
    try {
      const events = await (deps.readRecordedEvents ?? readRecordedEvents)(deps.client, { vault: vaultFilter, fromBlock, toBlock });
      const header = "actionHash,vault,agent,recipient,amount,nonce,blockNumber,txHash";
      const lines = events.map((e) =>
        [e.actionHash, e.vault, e.agent, e.recipient, e.amount, e.nonce, e.blockNumber, e.txHash].map(csvCell).join(","),
      );
      reply.header("content-type", "text/csv; charset=utf-8");
      reply.header("content-disposition", 'attachment; filename="beacon-receipts.csv"');
      return [header, ...lines].join("\n") + "\n";
    } catch (error) {
      return reply.code(502).send({ error: { code: "export", message: `Receipt export failed: ${error.message}` } });
    }
  });

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
    if (!isAddress(address ?? "")) {
      return reply.code(401).send({ error: { code: "address", message: "Address is invalid." } });
    }
    const nonce = await deps.store.takeChallenge(address ?? "");
    if (!nonce) return reply.code(401).send({ error: { code: "challenge", message: "Challenge expired." } });
    const message = `Beacon Arc login ${nonce}`;
    const ok = await verifyMessage({ address, message, signature });
    if (!ok) return reply.code(401).send({ error: { code: "signature", message: "Signature does not match this address." } });
    const token = newBearer();
    await deps.store.saveSession(token, address, Date.now() + 12 * 60 * 60 * 1000);
    return { token };
  });

  app.post("/v1/grants/revoke", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    const bearer = req.body?.bearer;
    if (!bearer) return reply.code(400).send({ error: { code: "bearer", message: "Bearer is required." } });
    const grant = await deps.store.readGrant(bearer);
    if (!grant) return reply.code(404).send({ error: { code: "grant", message: "Grant is already revoked or expired." } });
    const vault = await readers.readVault(deps.client, owner);
    if (!vault || vault.vault.toLowerCase() !== String(grant.vault).toLowerCase()) {
      return reply.code(403).send({ error: { code: "vault", message: "This session does not own that grant." } });
    }
    await deps.store.revokeGrant(bearer);
    return { revoked: true };
  });

  app.post("/v1/grants", async (req, reply) => {
    const owner = await sessionOwner(deps, req);
    if (!owner) return reply.code(401).send({ error: { code: "session", message: "Sign in again." } });
    const vault = await readers.readVault(deps.client, owner);
    if (!vault) return reply.code(404).send({ error: { code: "no_vault", message: "This owner has no vault." } });
    const agent = req.body?.agent;
    if (!isAddress(agent ?? "")) {
      return reply.code(400).send({ error: { code: "agent", message: "Agent must be a valid address." } });
    }
    const max = BigInt(req.body?.maxPerTx ?? vault.maxPerTx);
    if (max > vault.maxPerTx) {
      return reply.code(400).send({ error: { code: "over_cap", message: "Grant cap cannot exceed the vault policy." } });
    }
    const bearer = newBearer();
    await deps.store.saveGrant({
      id: newBearer(),
      vault: vault.vault,
      agent,
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

  app.post("/mcp", async (req, reply) => handleMcp(deps, readers, req, reply));

  const agentHits = new Map();
  app.get("/v1/agent/status", async () => ({
    ready: Boolean(deps.signAgentAction && deps.broadcastV2),
    vault: V2_VAULT,
    reason: deps.signAgentAction
      ? "The server holds the granted agent key. Only the vault owner can task it. The owner key is not on this server."
      : "The agent key is not configured. The task console is hidden.",
  }));

  app.post("/v1/agent/send", async (req, reply) => agentSend(deps, agentHits, req, reply));
  app.post("/v1/agent/swap", async (req, reply) => agentSwap(deps, agentHits, req, reply));

  const chatHits = new Map();
  app.get("/v1/chats", async (req, reply) => {
    const wallet = walletOf(req.query?.wallet);
    if (!wallet) return reply.code(400).send({ error: { code: "wallet", message: "A wallet address is required." } });
    return { ok: true, conversations: await deps.store.listChats(wallet) };
  });
  app.post("/v1/chats", async (req, reply) => {
    const wallet = walletOf(req.body?.wallet);
    if (!wallet) return reply.code(400).send({ error: { code: "wallet", message: "A wallet address is required." } });
    if (!rateAllow(chatHits, `chat:${clientIp(req)}`, 20, 10 * 60 * 1000, Date.now())) {
      return reply.code(429).send({ error: { code: "rate", message: "Too many new chats. Wait and retry." } });
    }
    const title = cleanTitle(req.body?.title);
    return { ok: true, conversation: await deps.store.createChat(wallet, title) };
  });
  app.get("/v1/chats/:id", async (req, reply) => {
    const wallet = walletOf(req.query?.wallet);
    if (!wallet) return reply.code(400).send({ error: { code: "wallet", message: "A wallet address is required." } });
    const row = await deps.store.readChat(req.params.id, wallet);
    if (!row) return reply.code(404).send({ error: { code: "missing", message: "That chat is not on this wallet." } });
    return { ok: true, ...row };
  });
  app.post("/v1/chats/:id/messages", async (req, reply) => {
    const wallet = walletOf(req.body?.wallet);
    if (!wallet) return reply.code(400).send({ error: { code: "wallet", message: "A wallet address is required." } });
    if (!rateAllow(chatHits, `msg:${clientIp(req)}`, 40, 10 * 60 * 1000, Date.now())) {
      return reply.code(429).send({ error: { code: "rate", message: "Too many messages. Wait and retry." } });
    }
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages.slice(0, 8) : [];
    const messages = incoming.flatMap((item) => {
      const role = item?.role === "user" || item?.role === "assistant" ? item.role : null;
      const text = typeof item?.text === "string" ? item.text.trim().slice(0, 4000) : "";
      return role && text ? [{ role, text }] : [];
    });
    if (!messages.length) return reply.code(400).send({ error: { code: "empty", message: "A message is required." } });
    const saved = await deps.store.appendChat(req.params.id, wallet, messages);
    if (!saved) return reply.code(404).send({ error: { code: "missing", message: "That chat is not on this wallet." } });
    return { ok: true };
  });
  app.patch("/v1/chats/:id", async (req, reply) => {
    const wallet = walletOf(req.body?.wallet);
    const title = typeof req.body?.title === "string" ? cleanTitle(req.body.title) : "";
    if (!wallet || !title) return reply.code(400).send({ error: { code: "title", message: "A wallet and a title are required." } });
    const renamed = await deps.store.renameChat(req.params.id, wallet, title);
    if (!renamed) return reply.code(404).send({ error: { code: "missing", message: "That chat is not on this wallet." } });
    return { ok: true };
  });

  return app;
}

function walletOf(value) {
  return typeof value === "string" && isAddress(value) ? value.toLowerCase() : null;
}

function cleanTitle(value) {
  const title = String(value ?? "New chat").replace(/\s+/g, " ").trim().slice(0, 80);
  return title || "New chat";
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
  return forwarded || req.ip || "local";
}

function publicAction(action) {
  return {
    grantId: action.grantId.toString(),
    agent: action.agent,
    actionClass: action.actionClass,
    token: action.token,
    recipient: action.recipient,
    amount: action.amount.toString(),
    tokenOut: action.tokenOut,
    amountOutMin: action.amountOutMin.toString(),
    quoteHash: action.quoteHash,
    destDomain: action.destDomain,
    nonce: action.nonce.toString(),
    deadline: action.deadline.toString(),
    policyVersion: action.policyVersion.toString(),
  };
}

async function ownerSession(deps, req, snapshot, reply) {
  const owner = await sessionOwner(deps, req);
  if (!owner) {
    reply.code(401).send({ error: { code: "session", message: "Sign in as the vault owner. This login does not move USDC. The agent signs the spend." } });
    return null;
  }
  if (owner.toLowerCase() !== snapshot.owner.toLowerCase()) {
    reply.code(403).send({ error: { code: "not_owner", message: "Only the vault owner can task the agent." } });
    return null;
  }
  return owner;
}

function agentConfigured(deps, reply) {
  if (deps.signAgentAction && deps.broadcastV2) return true;
  reply.code(503).send({
    error: { code: "agent_key_missing", message: "The agent key is not configured on this server. The task console cannot sign." },
  });
  return false;
}

async function agentSend(deps, hits, req, reply) {
  const now = deps.now ? deps.now() : Math.floor(Date.now() / 1000);
  const snapshot = await (deps.loadV2 ?? loadV2)(deps.client);
  const recipient = String(req.body?.recipient ?? "");
  const flags = isAddress(recipient)
    ? await (deps.loadRecipient ?? loadRecipient)(deps.client, snapshot.vault, recipient)
    : { allowed: false, blocked: false };
  const watchRevert = req.body?.confirm === "revert";
  const gate = watchRevert
    ? checkRevertDemo({ amount: req.body?.amount, maxPerTx: snapshot.maxPerTx, recipient, allowed: flags.allowed })
    : checkSend({
        amount: req.body?.amount,
        recipient,
        paused: snapshot.paused,
        allowed: flags.allowed,
        blocked: flags.blocked,
        grant: snapshot.grant,
        maxPerTx: snapshot.maxPerTx,
        windowLimit: snapshot.windowLimit,
        windowSpent: snapshot.windowSpent,
        now,
      });
  if (!gate.ok) return reply.code(400).send({ error: { code: gate.code, message: gate.message } });
  const action = {
    grantId: 1n,
    agent: snapshot.grant.agent,
    actionClass: 1,
    token: snapshot.usdc,
    recipient: gate.recipient,
    amount: gate.amount,
    tokenOut: ZERO,
    amountOutMin: 0n,
    quoteHash: `0x${"0".repeat(64)}`,
    destDomain: 0,
    nonce: snapshot.nonce,
    deadline: BigInt(now + 900),
    policyVersion: snapshot.policyVersion,
  };
  if (req.body?.confirm !== true && req.body?.confirm !== "revert") {
    return {
      status: "preview",
      label: watchRevert ? "this call is built to revert OverCap. no USDC moves" : "real transaction. dust amount",
      vault: snapshot.vault,
      action: publicAction(action),
    };
  }
  if (!agentConfigured(deps, reply)) return;
  if (!(await ownerSession(deps, req, snapshot, reply))) return;
  if (!rateAllow(hits, `send:${clientIp(req)}`, 8, 10 * 60 * 1000, Date.now())) {
    return reply.code(429).send({ error: { code: "rate", message: "Too many agent tasks from this address. Wait and retry." } });
  }
  if (deps.agentAddress && deps.agentAddress.toLowerCase() !== snapshot.grant.agent.toLowerCase()) {
    return reply.code(503).send({ error: { code: "agent_mismatch", message: "The server agent is not the granted agent. Nothing was signed." } });
  }
  const signature = await deps.signAgentAction(action);
  const txHash = await deps.broadcastV2(snapshot.vault, "executeSend", action, signature, watchRevert ? 120000n : undefined);
  const hash = actionHashV2(snapshot.vault, action);
  console.log(JSON.stringify({ event: watchRevert ? "agent_over_cap" : "agent_send", amount: action.amount.toString(), txHash }));
  return {
    status: watchRevert ? "reverted_broadcast" : "submitted",
    label: "real transaction. dust amount",
    txHash,
    actionHash: hash,
    verifyUrl: `/verify/${hash}`,
    explorer: `https://explorer.arc.io/tx/${txHash}`,
    action: publicAction(action),
  };
}

async function agentSwap(deps, hits, req, reply) {
  const now = deps.now ? deps.now() : Math.floor(Date.now() / 1000);
  const snapshot = await (deps.loadV2 ?? loadV2)(deps.client);
  const tokenOutAllowed = await (deps.loadTokenOut ?? loadTokenOut)(deps.client, snapshot.vault, snapshot.eurc);
  const gate = checkSwap({
    amount: req.body?.amount,
    paused: snapshot.paused,
    grant: snapshot.grant,
    maxPerTx: snapshot.maxPerTx,
    windowLimit: snapshot.windowLimit,
    windowSpent: snapshot.windowSpent,
    tokenOutAllowed,
    now,
  });
  if (!gate.ok) return reply.code(400).send({ error: { code: gate.code, message: gate.message } });
  let quote;
  try {
    quote = await (deps.quoteSwap ?? quoteV3)(deps.client, gate.amount.toString());
  } catch (error) {
    return reply.code(503).send({ error: { code: "quote", message: `No v3 quote: ${error.message}` } });
  }
  const floor = slippageFloor(quote.amountOut);
  if (floor === 0n) return reply.code(400).send({ error: { code: "quote", message: "The quoter returned no output. Nothing was signed." } });
  const quoteHash = quoteHashOf({ venue: "uniswap-v3", amountIn: gate.amount.toString(), amountOut: String(quote.amountOut), fee: quote.fee ?? 500 });
  const action = {
    grantId: 1n,
    agent: snapshot.grant.agent,
    actionClass: 2,
    token: snapshot.usdc,
    recipient: snapshot.vault,
    amount: gate.amount,
    tokenOut: snapshot.eurc,
    amountOutMin: floor,
    quoteHash,
    destDomain: 0,
    nonce: snapshot.nonce,
    deadline: BigInt(now + 900),
    policyVersion: snapshot.policyVersion,
  };
  const preview = {
    status: "preview",
    label: "real transaction. dust amount",
    vault: snapshot.vault,
    quote: { amountIn: gate.amount.toString(), amountOut: String(quote.amountOut), amountOutMin: floor.toString(), venue: "uniswap-v3" },
    action: publicAction(action),
  };
  if (req.body?.confirm !== true) return preview;
  if (!agentConfigured(deps, reply)) return;
  if (!(await ownerSession(deps, req, snapshot, reply))) return;
  if (!rateAllow(hits, `swap:${clientIp(req)}`, 4, 10 * 60 * 1000, Date.now())) {
    return reply.code(429).send({ error: { code: "rate", message: "Too many swap tasks from this address. Wait and retry." } });
  }
  if (deps.agentAddress && deps.agentAddress.toLowerCase() !== snapshot.grant.agent.toLowerCase()) {
    return reply.code(503).send({ error: { code: "agent_mismatch", message: "The server agent is not the granted agent. Nothing was signed." } });
  }
  const signature = await deps.signAgentAction(action);
  const txHash = await deps.broadcastV2(snapshot.vault, "executeSwap", action, signature);
  const hash = actionHashV2(snapshot.vault, action);
  console.log(JSON.stringify({ event: "agent_swap", amount: action.amount.toString(), txHash }));
  return { ...preview, status: "submitted", txHash, actionHash: hash, verifyUrl: `/verify/${hash}`, explorer: `https://explorer.arc.io/tx/${txHash}` };
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

async function handleMcp(deps, readers, req, reply) {
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
          { name: "verify", description: "Read a receipt from Arc. Does not invent one.", inputSchema: { type: "object", properties: { actionHash: { type: "string" } }, required: ["actionHash"] } },
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
    if (name === "verify") {
      const receipt = await readers.readReceipt(deps.client, args.actionHash);
      if (!receipt.exists) return toolResult(id, { error: "no_receipt" });
      return toolResult(id, receipt);
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

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toolResult(id, data) {
  return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(data) }] } };
}
