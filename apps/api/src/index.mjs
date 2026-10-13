import { readFileSync } from "node:fs";
import { createServer } from "./server.mjs";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, relayExecute, relayV2 } from "./chain.mjs";
import { ACTION_TYPES_V2, domainV2 } from "./eip712.mjs";
import { V2_VAULT } from "./constants.mjs";
import { memoryStore } from "./store.mjs";
import { pgStore } from "./pgstore.mjs";

loadEnv();

const rpc = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
const key = process.env.EXECUTOR_PRIVATE_KEY || "";
let store = memoryStore();
if (process.env.DATABASE_URL) {
  const db = pgStore(process.env.DATABASE_URL);
  try {
    await db.migrate();
    store = db;
  } catch (error) {
    // Fail closed: a broken migration must never silently reset to an empty
    // store (all sessions and grants would vanish). Exit non-zero instead.
    console.error(JSON.stringify({ event: "db_migrate_failed", code: error.code ?? "unknown" }));
    process.exit(1);
  }
}

const executorKey = key.startsWith("0x") || key === "" ? key : `0x${key}`;
const agentRaw = process.env.AGENT_PRIVATE_KEY || "";
const agentKey = agentRaw === "" ? "" : agentRaw.startsWith("0x") ? agentRaw : `0x${agentRaw}`;
const agentAccount = agentKey ? privateKeyToAccount(agentKey) : null;

const app = createServer({
  client: publicClient(rpc),
  store,
  broadcast: executorKey ? relayExecute(rpc, executorKey) : async () => {
    throw new Error("executor key missing");
  },
  broadcastV2: executorKey ? relayV2(rpc, executorKey) : null,
  agentAddress: agentAccount?.address ?? null,
  signAgentAction: agentAccount
    ? (message) => agentAccount.signTypedData({
        domain: domainV2(V2_VAULT),
        types: ACTION_TYPES_V2,
        primaryType: "Action",
        message,
      })
    : null,
});

const port = Number(process.env.PORT || 8787);
await app.listen({ port, host: "0.0.0.0" });
console.log(JSON.stringify({ event: "listening", port }));

function loadEnv() {
  try {
    const text = readFileSync(new URL("../../../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // Render injects the environment. A missing local file is expected there.
  }
}
