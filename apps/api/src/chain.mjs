import { createPublicClient, createWalletClient, http, encodeFunctionData, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARC_USDC,
  CHAIN_ID,
  FACTORY,
  V2_FACTORY,
  REGISTRY,
  REGISTRY_DEPLOY_BLOCK,
  V3_FACTORY,
  V3_ROUTER02,
  V3_QUOTER,
  V3_FEE,
  V3_USDC_EURC_500,
} from "./constants.mjs";

export { V3_FACTORY, V3_ROUTER02, V3_QUOTER, V3_FEE, V3_USDC_EURC_500, REGISTRY_DEPLOY_BLOCK };

export const V2_ROUTER = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa";
export const ARC_EURC = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";

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
  const zero = "0x0000000000000000000000000000000000000000";
  let vault = await client.readContract({ address: V2_FACTORY, abi: factoryAbi, functionName: "vaultOf", args: [owner] });
  if (vault === zero) {
    vault = await client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "vaultOf", args: [owner] });
  }
  if (vault === zero) return null;
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

const v2Abi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
];

export async function quoteV2(client, amountIn) {
  const amounts = await client.readContract({
    address: V2_ROUTER,
    abi: v2Abi,
    functionName: "getAmountsOut",
    args: [BigInt(amountIn), [ARC_USDC, ARC_EURC]],
  });
  return { amountIn: amounts[0].toString(), amountOut: amounts[1].toString() };
}

// --- Uniswap v3 pinned quoter -------------------------------------------------

const v3FactoryAbi = [
  { type: "function", name: "feeAmountTickSpacing", stateMutability: "view", inputs: [{ name: "fee", type: "uint24" }], outputs: [{ name: "tickSpacing", type: "int24" }] },
  { type: "function", name: "getPool", stateMutability: "view", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ name: "pool", type: "address" }] },
];
const v3RouterAbi = [
  { type: "function", name: "factory", stateMutability: "view", inputs: [], outputs: [{ name: "factory", type: "address" }] },
];
const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "fee", type: "uint24" },
      { name: "sqrtPriceLimitX96", type: "uint160" },
    ] }],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
];

// Squat guard: the real v3 deployment is pinned. Rejects a squatted or
// replaced router/factory before any quote is served.
export async function verifyQuoterPinned(client) {
  const [factory, tickSpacing] = await Promise.all([
    client.readContract({ address: V3_ROUTER02, abi: v3RouterAbi, functionName: "factory" }),
    client.readContract({ address: V3_FACTORY, abi: v3FactoryAbi, functionName: "feeAmountTickSpacing", args: [3000] }),
  ]);
  const pool = await client.readContract({
    address: V3_FACTORY, abi: v3FactoryAbi, functionName: "getPool", args: [ARC_USDC, ARC_EURC, V3_FEE],
  });
  const ok =
    factory.toLowerCase() === V3_FACTORY.toLowerCase() &&
    Number(tickSpacing) === 60 &&
    pool.toLowerCase() === V3_USDC_EURC_500.toLowerCase();
  return {
    ok,
    factory,
    tickSpacing: Number(tickSpacing),
    pool,
    reason: ok ? "pinned" : "router.factory(), feeAmountTickSpacing(3000), or USDC/EURC pool mismatch",
  };
}

// Quote-only. The vault has no swap function, so this never becomes a trade.
// QuoterV2 returns its quote as normal call data (verified live 2026-10-13:
// eth_call to quoteExactInputSingle returned ABI-encoded results, so no
// revert-data parsing is required on the public Arc RPC).
export async function quoteV3(client, amountIn) {
  const [amountOut] = await client.readContract({
    address: V3_QUOTER,
    abi: quoterV2Abi,
    functionName: "quoteExactInputSingle",
    args: [{ tokenIn: ARC_USDC, tokenOut: ARC_EURC, amountIn: BigInt(amountIn), fee: V3_FEE, sqrtPriceLimitX96: 0n }],
  });
  return {
    amountIn: BigInt(amountIn).toString(),
    amountOut: amountOut.toString(),
    venue: "uniswap-v3",
    pool: V3_USDC_EURC_500,
    fee: V3_FEE,
  };
}

// --- Receipt registry event scan ----------------------------------------------

const recordedEvent = parseAbiItem(
  "event Recorded(bytes32 indexed actionHash, address indexed vault, address agent, address recipient, uint256 amount, uint256 nonce)",
);

// Public Arc RPC log queries must be paginated to at most 9,999 blocks.
const LOG_CHUNK = 9999n;
const MAX_CHUNKS = 150;
const LOG_CHUNK_DELAY_MS = 750;
const LOG_CHUNK_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRateLimited(error) {
  const code = error?.code ?? error?.cause?.code;
  return code === -32005 || /rate limit|too many requests/i.test(error?.shortMessage ?? error?.message ?? "");
}

async function getLogsChunk(client, args) {
  let attempt = 0;
  for (;;) {
    try {
      return await client.getLogs(args);
    } catch (error) {
      attempt += 1;
      if (!isRateLimited(error) || attempt > LOG_CHUNK_RETRIES) throw error;
      await sleep(2000 * 2 ** (attempt - 1));
    }
  }
}

export async function readRecordedEvents(client, { fromBlock = REGISTRY_DEPLOY_BLOCK, toBlock, vault } = {}) {
  const end = toBlock === undefined ? await client.getBlockNumber() : BigInt(toBlock);
  const args = vault ? { vault } : undefined;
  const out = [];
  let from = BigInt(fromBlock);
  let chunks = 0;
  while (from <= end && chunks < MAX_CHUNKS) {
    const chunkTo = from + LOG_CHUNK > end ? end : from + LOG_CHUNK;
    const logs = await getLogsChunk(client, { address: REGISTRY, event: recordedEvent, args, fromBlock: from, toBlock: chunkTo });
    for (const log of logs) {
      out.push({
        actionHash: log.args.actionHash,
        vault: log.args.vault,
        agent: log.args.agent,
        recipient: log.args.recipient,
        amount: log.args.amount.toString(),
        nonce: log.args.nonce.toString(),
        blockNumber: log.blockNumber.toString(),
        txHash: log.transactionHash,
      });
    }
    from = chunkTo + 1n;
    chunks += 1;
    if (from <= end && chunks < MAX_CHUNKS) await sleep(LOG_CHUNK_DELAY_MS);
  }
  return out;
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

const v2Action = [
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
];

const v2ExecAbi = [
  { type: "function", name: "executeSend", stateMutability: "nonpayable", inputs: [
    { name: "action", type: "tuple", components: v2Action },
    { name: "signature", type: "bytes" },
  ], outputs: [] },
  { type: "function", name: "executeSwap", stateMutability: "nonpayable", inputs: [
    { name: "action", type: "tuple", components: v2Action },
    { name: "signature", type: "bytes" },
  ], outputs: [] },
];

function tupleV2(action) {
  return {
    grantId: BigInt(action.grantId),
    agent: action.agent,
    actionClass: Number(action.actionClass),
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

/** Relay a V2 executeSend or executeSwap. The executor key cannot change the signed fields. */
export function relayV2(rpcUrl, privateKey) {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: arc, transport: http(rpcUrl) });
  return async (vault, functionName, action, signature, gas) => {
    const hash = await wallet.sendTransaction({
      to: vault,
      data: encodeFunctionData({ abi: v2ExecAbi, functionName, args: [tupleV2(action), signature] }),
      gas,
      maxFeePerGas: 24_000_000_000n,
      maxPriorityFeePerGas: 1_000_000n,
    });
    return hash;
  };
}

export async function readDecimals(client) {
  return client.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "decimals" });
}
