import { hashTypedData, recoverTypedDataAddress } from "viem";
import { ARC_USDC } from "./constants.mjs";

export const ACTION_TYPES = {
  Action: [
    { name: "grantId", type: "uint256" },
    { name: "agent", type: "address" },
    { name: "actionClass", type: "uint8" },
    { name: "token", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "tokenOut", type: "address" },
    { name: "amountOutMin", type: "uint256" },
    { name: "quoteHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "policyVersion", type: "uint256" },
  ],
};

export function domain(vault) {
  return { name: "Beacon", version: "1", chainId: 5042, verifyingContract: vault };
}

export function toMessage(action) {
  return {
    grantId: BigInt(action.grantId),
    agent: action.agent,
    actionClass: action.actionClass,
    token: action.token,
    recipient: action.recipient,
    amount: BigInt(action.amount),
    tokenOut: action.tokenOut,
    amountOutMin: BigInt(action.amountOutMin),
    quoteHash: action.quoteHash,
    nonce: BigInt(action.nonce),
    deadline: BigInt(action.deadline),
    policyVersion: BigInt(action.policyVersion),
  };
}

export function actionHash(vault, action) {
  return hashTypedData({ domain: domain(vault), types: ACTION_TYPES, primaryType: "Action", message: toMessage(action) });
}

export async function recoverAgent(vault, action, signature) {
  return recoverTypedDataAddress({
    domain: domain(vault),
    types: ACTION_TYPES,
    primaryType: "Action",
    message: toMessage(action),
    signature,
  });
}

export function sendTypedData(vault, fields) {
  const message = {
    grantId: fields.grantId,
    agent: fields.agent,
    actionClass: 1,
    token: ARC_USDC,
    recipient: fields.recipient,
    amount: fields.amount,
    tokenOut: "0x0000000000000000000000000000000000000000",
    amountOutMin: "0",
    quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: fields.nonce,
    deadline: fields.deadline,
    policyVersion: fields.policyVersion,
  };
  return { domain: domain(vault), types: ACTION_TYPES, primaryType: "Action", message };
}

// ---------------------------------------------------------------------------
// V2 (BeaconUsdcVaultV2): the firewall that can also swap and bridge.
// The V2 Action struct appends uint32 destDomain after quoteHash, and the
// domain separator binds name="Beacon", version="2", verifyingContract=V2 vault.
// V1 signatures can never verify as V2 actions (and vice versa).
// ---------------------------------------------------------------------------

export const CLASS_SEND = 1;
export const CLASS_SWAP = 2;
export const CLASS_BRIDGE = 3;

/// Grant scope bits on V2: 1 = send, 2 = swap, 4 = bridge.
export const SCOPE_SEND = 1;
export const SCOPE_SWAP = 2;
export const SCOPE_BRIDGE = 4;

export const V2_TYPE_STRING =
  "Action(uint256 grantId,address agent,uint8 actionClass,address token,address recipient,uint256 amount,address tokenOut,uint256 amountOutMin,bytes32 quoteHash,uint32 destDomain,uint256 nonce,uint256 deadline,uint256 policyVersion)";

export const ACTION_TYPES_V2 = {
  Action: [
    { name: "grantId", type: "uint256" },
    { name: "agent", type: "address" },
    { name: "actionClass", type: "uint8" },
    { name: "token", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "tokenOut", type: "address" },
    { name: "amountOutMin", type: "uint256" },
    { name: "quoteHash", type: "bytes32" },
    { name: "destDomain", type: "uint32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "policyVersion", type: "uint256" },
  ],
};

export function domainV2(vault) {
  return { name: "Beacon", version: "2", chainId: 5042, verifyingContract: vault };
}

export function toMessageV2(action) {
  return {
    grantId: BigInt(action.grantId),
    agent: action.agent,
    actionClass: action.actionClass,
    token: action.token,
    recipient: action.recipient,
    amount: BigInt(action.amount),
    tokenOut: action.tokenOut,
    amountOutMin: BigInt(action.amountOutMin),
    quoteHash: action.quoteHash,
    destDomain: Number(action.destDomain ?? 0),
    nonce: BigInt(action.nonce),
    deadline: BigInt(action.deadline),
    policyVersion: BigInt(action.policyVersion),
  };
}

export function actionHashV2(vault, action) {
  return hashTypedData({ domain: domainV2(vault), types: ACTION_TYPES_V2, primaryType: "Action", message: toMessageV2(action) });
}

export async function recoverAgentV2(vault, action, signature) {
  return recoverTypedDataAddress({
    domain: domainV2(vault),
    types: ACTION_TYPES_V2,
    primaryType: "Action",
    message: toMessageV2(action),
    signature,
  });
}

/// Build the EIP-712 typed data for a V2 swap action (CLASS_SWAP=2).
/// The recipient is ALWAYS the vault itself: swap output can only land back
/// in the vault. The chain enforces this; the builder mirrors it.
export function swapTypedData(vault, fields) {
  const message = {
    grantId: fields.grantId,
    agent: fields.agent,
    actionClass: CLASS_SWAP,
    token: ARC_USDC,
    recipient: vault,
    amount: fields.amount,
    tokenOut: fields.tokenOut,
    amountOutMin: fields.amountOutMin,
    quoteHash: fields.quoteHash,
    destDomain: 0,
    nonce: fields.nonce,
    deadline: fields.deadline,
    policyVersion: fields.policyVersion,
  };
  return { domain: domainV2(vault), types: ACTION_TYPES_V2, primaryType: "Action", message };
}

/// Build the EIP-712 typed data for a V2 bridge action (CLASS_BRIDGE=3).
/// The mint recipient lives on the destination chain but is still an
/// allowlisted address; the vault enforces the domain and recipient allowlists.
export function bridgeTypedData(vault, fields) {
  const message = {
    grantId: fields.grantId,
    agent: fields.agent,
    actionClass: CLASS_BRIDGE,
    token: ARC_USDC,
    recipient: fields.mintRecipient,
    amount: fields.amount,
    tokenOut: "0x0000000000000000000000000000000000000000",
    amountOutMin: "0",
    quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    destDomain: fields.destDomain,
    nonce: fields.nonce,
    deadline: fields.deadline,
    policyVersion: fields.policyVersion,
  };
  return { domain: domainV2(vault), types: ACTION_TYPES_V2, primaryType: "Action", message };
}
