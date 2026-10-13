import { getAddress, isAddress, keccak256, toBytes } from "viem";

/** Dust console caps. A call cannot move more than these base units (USDC has 6 decimals). */
export const SEND_CAP = 1000n;
export const SWAP_CAP = 5000n;
export const REVERT_DEMO_CAP = 20000n;
export const SCOPE_SEND = 1;
export const SCOPE_SWAP = 2;
export const ZERO = "0x0000000000000000000000000000000000000000";

export function parseBaseUnits(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || text.length > 12) return null;
  return BigInt(text);
}

function fail(code, message) {
  return { ok: false, code, message };
}

function grantGate(grant, now, scopeBit, scopeName) {
  if (!grant?.active || !grant.agent || grant.agent === ZERO) {
    return fail("GrantInactive", "Grant 1 has no active agent. The owner registers one first.");
  }
  if (BigInt(grant.expiry) <= BigInt(now)) {
    return fail("GrantExpired", "The agent grant has expired. The owner must grant again.");
  }
  if ((Number(grant.scopes) & scopeBit) === 0) {
    return fail("ScopeDenied", `This grant cannot ${scopeName}.`);
  }
  return null;
}

export function checkSend(input) {
  const { amount, recipient, paused, allowed, blocked, grant, maxPerTx, windowLimit, windowSpent, now } = input;
  if (paused) return fail("paused", "The vault is paused. The owner resumes it before any send.");
  const amt = parseBaseUnits(amount);
  if (amt === null || amt === 0n) {
    return fail("amount", "Amount must be a positive whole number of base units (6 decimals). 0.001 USDC is 1000.");
  }
  if (!isAddress(String(recipient ?? ""))) return fail("recipient", "Recipient must be a 0x address.");
  if (blocked) return fail("RecipientBlocked", "That address is blocked. A send to it reverts.");
  if (!allowed) {
    return fail("RecipientNotAllowed", "That address is not on the allowlist. The owner allows it first.");
  }
  const gate = grantGate(grant, now, SCOPE_SEND, "send");
  if (gate) return gate;
  if (amt > BigInt(grant.maxPerTx) || amt > BigInt(maxPerTx)) {
    return fail("OverCap", `Amount ${amt} is above the cap (grant ${grant.maxPerTx}, vault ${maxPerTx}). The vault would revert OverCap.`);
  }
  if (amt > SEND_CAP) {
    return fail("dust_cap", `This console moves at most ${SEND_CAP} base units (0.001 USDC) per call.`);
  }
  if (BigInt(windowSpent) + amt > BigInt(windowLimit)) {
    return fail("OverWindow", "This amount would exceed the daily window.");
  }
  return { ok: true, amount: amt, recipient: getAddress(recipient) };
}

export function checkSwap(input) {
  const { amount, paused, grant, maxPerTx, windowLimit, windowSpent, tokenOutAllowed, now } = input;
  if (paused) return fail("paused", "The vault is paused. The owner resumes it before any swap.");
  const amt = parseBaseUnits(amount);
  if (amt === null || amt === 0n) {
    return fail("amount", "Amount must be a positive whole number of base units. 0.005 USDC is 5000.");
  }
  if (!tokenOutAllowed) return fail("TokenNotAllowed", "EURC is not an allowlisted output. The vault will not trade it.");
  const gate = grantGate(grant, now, SCOPE_SWAP, "swap");
  if (gate) return gate;
  if (amt > BigInt(grant.maxPerTx) || amt > BigInt(maxPerTx)) {
    return fail("OverCap", `Amount ${amt} is above the cap. The vault would revert OverCap.`);
  }
  if (amt > SWAP_CAP) {
    return fail("dust_cap", `This console swaps at most ${SWAP_CAP} base units (0.005 USDC) per call.`);
  }
  if (BigInt(windowSpent) + amt > BigInt(windowLimit)) {
    return fail("OverWindow", "This amount would exceed the daily window.");
  }
  return { ok: true, amount: amt };
}

/** An over-cap attempt may be broadcast only so the receipt shows a revert. It must stay dust-scale. */
export function checkRevertDemo(input) {
  const amt = parseBaseUnits(input.amount);
  if (amt === null) return fail("amount", "Amount must be a whole number of base units.");
  if (amt <= BigInt(input.maxPerTx)) return fail("not_over_cap", "That amount is inside the cap, so it would not revert.");
  if (amt > REVERT_DEMO_CAP) return fail("dust_cap", "The revert demo stays at or below 20000 base units.");
  if (!isAddress(String(input.recipient ?? ""))) return fail("recipient", "Recipient must be a 0x address.");
  if (!input.allowed) return fail("RecipientNotAllowed", "Use an allowlisted recipient so the revert reason is OverCap, not the allowlist.");
  return { ok: true, amount: amt, recipient: getAddress(input.recipient) };
}

export function rateAllow(bucket, key, limit, windowMs, now) {
  const hits = (bucket.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    bucket.set(key, hits);
    return false;
  }
  hits.push(now);
  bucket.set(key, hits);
  return true;
}

export function quoteHashOf(payload) {
  return keccak256(toBytes(JSON.stringify(payload)));
}

export function slippageFloor(amountOut) {
  return (BigInt(amountOut) * 99n) / 100n;
}
