import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { hashSecret } from "./store.mjs";

export function pgStore(url) {
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  return {
    async migrate() {
      const dir = new URL("../../../db/migrations/", import.meta.url);
      const names = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
      for (const name of names) {
        await pool.query(readFileSync(new URL(name, dir), "utf8"));
      }
    },
    async ping() {
      await pool.query("select 1");
      return true;
    },
    async saveChallenge(address, nonce, expiresAt) {
      await pool.query(
        `insert into sessions (address, nonce, expires_at) values ($1, $2, to_timestamp($3 / 1000.0))
         on conflict (address) do update set nonce = excluded.nonce, expires_at = excluded.expires_at`,
        [address.toLowerCase(), nonce, expiresAt],
      );
    },
    async takeChallenge(address) {
      const result = await pool.query("delete from sessions where address = $1 returning nonce, expires_at", [address.toLowerCase()]);
      const row = result.rows[0];
      if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
      return row.nonce;
    },
    async saveSession(token, address, expiresAt) {
      await pool.query(
        "insert into session_tokens (token_hash, address, expires_at) values ($1, $2, to_timestamp($3 / 1000.0))",
        [hashSecret(token), address.toLowerCase(), expiresAt],
      );
    },
    async readSession(token) {
      const result = await pool.query("select address, expires_at from session_tokens where token_hash = $1", [hashSecret(token)]);
      const row = result.rows[0];
      if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
      return row.address;
    },
    async saveGrant(grant) {
      await pool.query(
        `insert into agent_grants (id, vault, agent, bearer_hash, scopes, max_per_tx, expires_at, revoked)
         values ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0), false)`,
        [grant.id, grant.vault.toLowerCase(), grant.agent.toLowerCase(), hashSecret(grant.bearer), grant.scopes, grant.maxPerTx.toString(), grant.expiresAt],
      );
    },
    async readGrant(bearer) {
      const result = await pool.query(
        "select id, vault, agent, scopes, max_per_tx, expires_at, revoked from agent_grants where bearer_hash = $1",
        [hashSecret(bearer)],
      );
      const row = result.rows[0];
      if (!row || row.revoked || new Date(row.expires_at).getTime() < Date.now()) return null;
      return { ...row, maxPerTx: BigInt(row.max_per_tx), expiresAt: new Date(row.expires_at).getTime(), agent: row.agent };
    },
    async revokeGrant(bearer) {
      await pool.query("update agent_grants set revoked = true where bearer_hash = $1", [hashSecret(bearer)]);
    },
    async getAction(actionHash) {
      const result = await pool.query("select tx_hash from action_idempotency where action_hash = $1", [actionHash.toLowerCase()]);
      return result.rows[0]?.tx_hash ?? null;
    },
    async saveAction(actionHash, txHash) {
      await pool.query(
        "insert into action_idempotency (action_hash, tx_hash) values ($1, $2) on conflict (action_hash) do nothing",
        [actionHash.toLowerCase(), txHash],
      );
    },
    async listChats(wallet) {
      const result = await pool.query(
        `select c.id, c.title, c.agent_id, c.pinned, c.updated_at, c.created_at,
                (select body from flow_messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message
         from flow_conversations c
         where c.wallet = $1 and c.archived = false
         order by c.updated_at desc
         limit 50`,
        [wallet.toLowerCase()],
      );
      return result.rows.map(chatJson);
    },
    async createChat(wallet, title) {
      const id = randomBytes(16).toString("hex");
      const result = await pool.query(
        `insert into flow_conversations (id, wallet, title)
         values ($1, $2, $3)
         returning id, title, agent_id, pinned, updated_at, created_at`,
        [id, wallet.toLowerCase(), title],
      );
      return chatJson({ ...result.rows[0], last_message: null });
    },
    async readChat(id, wallet) {
      const conversation = await pool.query(
        `select id, title, agent_id, pinned, updated_at, created_at
         from flow_conversations where id = $1 and wallet = $2 and archived = false`,
        [id, wallet.toLowerCase()],
      );
      const row = conversation.rows[0];
      if (!row) return null;
      const messages = await pool.query(
        `select id, role, body, created_at from flow_messages
         where conversation_id = $1 order by created_at asc`,
        [id],
      );
      return {
        conversation: chatJson(row),
        messages: messages.rows.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.body,
          createdAt: new Date(message.created_at).toISOString(),
        })),
      };
    },
    async appendChat(id, wallet, messages) {
      const owned = await pool.query(
        "select id from flow_conversations where id = $1 and wallet = $2 and archived = false",
        [id, wallet.toLowerCase()],
      );
      if (!owned.rows[0]) return false;
      for (const message of messages) {
        const messageId = randomBytes(16).toString("hex");
        await pool.query(
          "insert into flow_messages (id, conversation_id, role, body) values ($1, $2, $3, $4)",
          [messageId, id, message.role, message.text],
        );
      }
      await pool.query("update flow_conversations set updated_at = now() where id = $1", [id]);
      return true;
    },
    async renameChat(id, wallet, title) {
      const result = await pool.query(
        "update flow_conversations set title = $3, updated_at = now() where id = $1 and wallet = $2 and archived = false",
        [id, wallet.toLowerCase(), title],
      );
      return result.rowCount > 0;
    },
  };
}

function chatJson(row) {
  return {
    id: row.id,
    title: row.title,
    agent_id: row.agent_id,
    pinned: row.pinned,
    updated_at: new Date(row.updated_at).toISOString(),
    created_at: new Date(row.created_at).toISOString(),
    last_message: row.last_message ?? null,
  };
}
