import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_USDC, CHAIN_ID, FACTORY, REGISTRY } from "./constants.mjs";

const arc = {
  id: CHAIN_ID,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
};

const factoryAbi = [
  { type: "function", name: "vaultOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "address" }] },
];
const vaultAbi = [
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "maxPerTx", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "windowLimit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "windowSpent", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "policyVersion", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nonce", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "executor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "allowedRecipient", stateMutability: "view", inputs: [{ name: "recipient", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "blockedRecipient", stateMutability: "view", inputs: [{ name: "recipient", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "hashAction", stateMutability: "view", inputs: [{
    name: "action",
    type: "tuple",
    components: [
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
  }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "executeSend", stateMutability: "nonpayable", inputs: [
    { name: "action", type: "tuple", components: [
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
    ] },
    { name: "signature", type: "bytes" },
  ], outputs: [] },
];
const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];
const registryAbi = [
  { type: "function", name: "receipts", stateMutability: "view", inputs: [{ name: "actionHash", type: "bytes32" }], outputs: [
    { name: "vault", type: "address" },
    { name: "agent", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "exists", type: "bool" },
  ] },
];

export function publicClient(rpcUrl) {
  return createPublicClient({ chain: { ...arc, rpcUrls: { default: { http: [rpcUrl] } } }, transport: http(rpcUrl) });
}

export async function readChainId(client) {
  return Number(await client.getChainId());
}

export async function factoryHasCode(client, factory = FACTORY) {
  const code = await client.getBytecode({ address: factory });
  return Boolean(code && code !== "0x");
}

export async function readVault(client, owner) {
  const vault = await client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "vaultOf", args: [owner] });
  if (vault === "0x0000000000000000000000000000000000000000") return null;
  const [paused, maxPerTx, windowLimit, windowSpent, policyVersion, nonce, executor, usdcBalance] = await Promise.all([
    client.readContract({ address: vault, abi: vaultAbi, functionName: "paused" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "maxPerTx" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "windowLimit" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "windowSpent" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "policyVersion" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "nonce" }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "executor" }),
    client.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "balanceOf", args: [vault] }),
  ]);
  return {
    vault,
    owner,
    paused,
    maxPerTx,
    windowLimit,
    windowSpent,
    policyVersion,
    nonce,
    executor,
    usdcBalance,
  };
}

export async function readRecipient(client, vault, recipient) {
  const [allowedRecipient, blockedRecipient] = await Promise.all([
    client.readContract({ address: vault, abi: vaultAbi, functionName: "allowedRecipient", args: [recipient] }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: "blockedRecipient", args: [recipient] }),
  ]);
  return { allowedRecipient, blockedRecipient };
}

export async function readReceipt(client, actionHash) {
  const row = await client.readContract({ address: REGISTRY, abi: registryAbi, functionName: "receipts", args: [actionHash] });
  return {
    vault: row[0],
    agent: row[1],
    recipient: row[2],
    amount: row[3].toString(),
    nonce: row[4].toString(),
    exists: row[5],
  };
}

export async function onchainActionHash(client, vault, action) {
  return client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: "hashAction",
    args: [tuple(action)],
  });
}

export function tuple(action) {
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

export function relayExecute(rpcUrl, privateKey) {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: arc, transport: http(rpcUrl) });
  return async (vault, action, signature) => {
    const hash = await wallet.sendTransaction({
      to: vault,
      data: encodeFunctionData({ abi: vaultAbi, functionName: "executeSend", args: [tuple(action), signature] }),
      maxFeePerGas: 40_000_000_000n,
      maxPriorityFeePerGas: 1_000_000n,
    });
    return hash;
  };
}

export async function readDecimals(client) {
  return client.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "decimals" });
}
