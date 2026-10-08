import { readFileSync } from "node:fs";
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
      const sql = readFileSync(new URL("../../../db/migrations/001_grants.sql", import.meta.url), "utf8");
      await pool.query(sql);
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
  };
}
