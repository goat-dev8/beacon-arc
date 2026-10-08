import { createHash, randomBytes } from "node:crypto";

export function hashSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function memoryStore() {
  const challenges = new Map();
  const sessions = new Map();
  const grants = new Map();
  const actions = new Map();
  return {
    async ping() {
      return true;
    },
    async saveChallenge(address, nonce, expiresAt) {
      challenges.set(address.toLowerCase(), { nonce, expiresAt });
    },
    async takeChallenge(address) {
      const row = challenges.get(address.toLowerCase());
      challenges.delete(address.toLowerCase());
      if (!row || row.expiresAt < Date.now()) return null;
      return row.nonce;
    },
    async saveSession(token, address, expiresAt) {
      sessions.set(hashSecret(token), { address: address.toLowerCase(), expiresAt });
    },
    async readSession(token) {
      const row = sessions.get(hashSecret(token));
      if (!row || row.expiresAt < Date.now()) return null;
      return row.address;
    },
    async saveGrant(grant) {
      grants.set(hashSecret(grant.bearer), { ...grant, bearerHash: hashSecret(grant.bearer) });
    },
    async readGrant(bearer) {
      const row = grants.get(hashSecret(bearer));
      if (!row || row.revoked || row.expiresAt < Date.now()) return null;
      return row;
    },
    async revokeGrant(bearer) {
      const row = grants.get(hashSecret(bearer));
      if (row) row.revoked = true;
    },
    async getAction(actionHash) {
      return actions.get(actionHash.toLowerCase()) ?? null;
    },
    async saveAction(actionHash, txHash) {
      actions.set(actionHash.toLowerCase(), txHash);
    },
  };
}

export function newBearer() {
  return randomBytes(32).toString("hex");
}
