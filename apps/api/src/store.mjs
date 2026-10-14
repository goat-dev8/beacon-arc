import { createHash, randomBytes } from "node:crypto";

export function hashSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function memoryStore() {
  const challenges = new Map();
  const sessions = new Map();
  const grants = new Map();
  const actions = new Map();
  const chats = new Map();
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
    async listChats(wallet) {
      return [...chats.values()]
        .filter((row) => row.wallet === wallet.toLowerCase() && !row.archived)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(publicChat);
    },
    async createChat(wallet, title) {
      const now = new Date().toISOString();
      const row = {
        id: randomBytes(16).toString("hex"),
        wallet: wallet.toLowerCase(),
        title,
        agent_id: "general",
        pinned: false,
        archived: false,
        updated_at: now,
        created_at: now,
        messages: [],
      };
      chats.set(row.id, row);
      return publicChat(row);
    },
    async readChat(id, wallet) {
      const row = chats.get(id);
      if (!row || row.wallet !== wallet.toLowerCase() || row.archived) return null;
      return {
        conversation: publicChat(row),
        messages: row.messages.map((message) => ({ ...message })),
      };
    },
    async appendChat(id, wallet, messages) {
      const row = chats.get(id);
      if (!row || row.wallet !== wallet.toLowerCase() || row.archived) return false;
      const now = new Date().toISOString();
      for (const message of messages) {
        row.messages.push({
          id: randomBytes(16).toString("hex"),
          role: message.role,
          text: message.text,
          createdAt: now,
        });
      }
      row.updated_at = now;
      return true;
    },
    async renameChat(id, wallet, title) {
      const row = chats.get(id);
      if (!row || row.wallet !== wallet.toLowerCase() || row.archived) return false;
      row.title = title;
      row.updated_at = new Date().toISOString();
      return true;
    },
  };
}

function publicChat(row) {
  return {
    id: row.id,
    title: row.title,
    agent_id: row.agent_id,
    pinned: row.pinned,
    updated_at: row.updated_at,
    created_at: row.created_at,
    last_message: row.messages?.at(-1)?.text ?? row.last_message ?? null,
  };
}

export function newBearer() {
  return randomBytes(32).toString("hex");
}
