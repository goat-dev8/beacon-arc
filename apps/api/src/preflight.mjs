import { ARC_USDC } from "./constants.mjs";

/** Decide whether a signed action is worth broadcasting. Does not edit the action. */
export function preflightSend(action, vault, nowSeconds) {
  if (action.actionClass !== 1) return deny("scope");
  if (action.token.toLowerCase() !== ARC_USDC.toLowerCase()) return deny("token");
  if (action.tokenOut !== "0x0000000000000000000000000000000000000000") return deny("token");
  if (vault.paused) return deny("paused");
  if (action.policyVersion !== vault.policyVersion) return deny("policy");
  if (action.nonce !== vault.nonce) return deny("nonce");
  if (action.deadline < nowSeconds) return deny("expired");
  if (action.amount <= 0n || action.amount > vault.maxPerTx) return deny("over_cap");
  if (vault.windowSpent + action.amount > vault.windowLimit) return deny("over_window");
  if (!vault.allowedRecipient || vault.blockedRecipient) return deny("recipient");
  return { ok: true };
}

function deny(reason) {
  return { ok: false, reason };
}
