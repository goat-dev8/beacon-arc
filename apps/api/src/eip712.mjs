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
