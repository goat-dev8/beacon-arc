import { readFileSync } from "node:fs";
import { createServer } from "./server.mjs";
import { publicClient, relayExecute } from "./chain.mjs";
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
    console.error(JSON.stringify({ event: "db_migrate_failed", code: error.code ?? "unknown" }));
    store = {
      ...memoryStore(),
      async ping() {
        return false;
      },
    };
  }
}

const app = createServer({
  client: publicClient(rpc),
  store,
  broadcast: key ? relayExecute(rpc, key.startsWith("0x") ? key : `0x${key}`) : async () => {
    throw new Error("executor key missing");
  },
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
