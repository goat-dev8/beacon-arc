import type { JobStatus } from "./types";

export interface ExecutionStep {
  id: string;
  label: string;
  detail: string;
  statusKey: JobStatus | "LOCK";
}

export const ZEROG_STEPS_WALLET: ExecutionStep[] = [
  {
    id: "wallet",
    label: "Wallet on Arc",
    detail: "EIP-1193 connect · chain 5042",
    statusKey: "LOCK",
  },
  {
    id: "auth",
    label: "Read the policy",
    detail: "Cap, window, nonce, and recipient allowlist",
    statusKey: "AUTHORIZED",
  },
  {
    id: "lock",
    label: "Agent signs the action",
    detail: "EIP-712. The executor cannot change the fields.",
    statusKey: "AUTHORIZED",
  },
  {
    id: "generate",
    label: "Executor relays",
    detail: "The signed action is submitted. No compute job is quoted.",
    statusKey: "GENERATING",
  },
  {
    id: "accept",
    label: "Vault transfers USDC",
    detail: "The vault builds USDC.transfer itself.",
    statusKey: "ACCEPTING",
  },
  {
    id: "settle",
    label: "Unavailable rails stay off",
    detail: "CCTP, privacy, PQ, and x402 stay off. Send and swap are live.",
    statusKey: "SETTLING",
  },
  {
    id: "receipt",
    label: "Receipt recorded",
    detail: "BeaconReceiptRegistry.receipts(bytes32) on Arc",
    statusKey: "CLOSED",
  },
];

export const ZEROG_STEPS_SAFE: ExecutionStep[] = [
  {
    id: "safe",
    label: "Vault holds USDC",
    detail: "ERC-20 balance. Same pool as native USDC. Do not add them.",
    statusKey: "LOCK",
  },
  {
    id: "spend",
    label: "Owner sets policy",
    detail: "Grant, cap, and allowlist. The executor cannot set these.",
    statusKey: "AUTHORIZED",
  },
  {
    id: "lock",
    label: "Agent signs the action",
    detail: "EIP-712 Action bound to this vault.",
    statusKey: "AUTHORIZED",
  },
  {
    id: "generate",
    label: "Executor relays",
    detail: "Relay only. The signature is the authority.",
    statusKey: "GENERATING",
  },
  {
    id: "accept",
    label: "Vault transfers USDC",
    detail: "Recipient must already be allowlisted.",
    statusKey: "ACCEPTING",
  },
  {
    id: "settle",
    label: "Unavailable rails stay off",
    detail: "No swap, CCTP, privacy, PQ, or x402 success path.",
    statusKey: "SETTLING",
  },
  {
    id: "receipt",
    label: "Receipt recorded",
    detail: "BeaconReceiptRegistry.receipts(bytes32) on Arc",
    statusKey: "CLOSED",
  },
];

export const ZEROG_STEPS = ZEROG_STEPS_WALLET;

const ORDER: JobStatus[] = [
  "AUTHORIZED",
  "PREPARING",
  "GENERATING",
  "COMPOSING",
  "ACCEPTING",
  "PASSED",
  "SETTLING",
  "CLOSED",
];

export function executionStepState(
  step: ExecutionStep,
  status: JobStatus | undefined,
  hasLock: boolean,
): "done" | "active" | "todo" {
  const effective: JobStatus | undefined =
    hasLock && (!status || status === "QUOTED" || status === "DRAFT")
      ? "AUTHORIZED"
      : status;

  if (!effective) return "todo";

  if (step.statusKey === "LOCK") {
    return hasLock || ORDER.indexOf(effective) >= 0 ? "done" : "todo";
  }

  if (effective === "FAILED" || effective === "REFUSING") {
    const i = ORDER.indexOf(step.statusKey as JobStatus);
    const acceptIdx = ORDER.indexOf("ACCEPTING");
    if (effective === "FAILED" && step.id === "generate") return "done";
    if (i >= 0 && i <= acceptIdx) return "done";
    if (step.id === "settle" || step.id === "receipt") return "done";
    return "todo";
  }

  const cur = ORDER.indexOf(effective);
  if (cur < 0) return "todo";

  if (step.id === "spend" || step.id === "auth" || step.id === "lock") {
    if (hasLock || cur > ORDER.indexOf("AUTHORIZED")) return "done";
    if (effective === "AUTHORIZED") return step.id === "lock" ? "active" : "done";
    return "todo";
  }

  const stepIdx = ORDER.indexOf(step.statusKey as JobStatus);
  if (stepIdx < 0) return "todo";
  if (effective === "CLOSED" || effective === "PASSED") return "done";
  if (
    step.statusKey === "GENERATING" &&
    (effective === "AUTHORIZED" ||
      effective === "PREPARING" ||
      effective === "GENERATING" ||
      effective === "COMPOSING")
  ) {
    return "active";
  }
  if (cur > stepIdx) return "done";
  if (cur === stepIdx) return "active";
  return "todo";
}
