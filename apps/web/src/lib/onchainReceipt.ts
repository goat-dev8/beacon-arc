import { decodeFunctionResult, encodeFunctionData, keccak256, sha256, toBytes, type Hex } from "viem";
import { CONTRACTS, NETWORK, V2_CONTRACTS } from "./chain";

/** Active V2 registry first, then the V1 registry for pre-V2 receipts. */
const RECEIPT_REGISTRIES = [V2_CONTRACTS.receiptRegistry, CONTRACTS.receiptRegistry] as const;

const RECEIPTS_ABI = [
  {
    type: "function",
    name: "receipts",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [
      { name: "storageRoot", type: "bytes32" },
      { name: "teeSigner", type: "address" },
      { name: "chatIdHash", type: "bytes32" },
      { name: "quoteHash", type: "bytes32" },
      { name: "allowed", type: "bool" },
      { name: "exists", type: "bool" },
      { name: "recordedAt", type: "uint256" },
      { name: "recorder", type: "address" },
    ],
  },
] as const;

export type BrowserReceipt = {
  exists: boolean;
  storageRoot?: string;
  teeSigner?: string;
  chatIdHash?: string;
  quoteHash?: string;
  allowed?: boolean;
  recordedAt?: string;
  recorder?: string;
  rpc: string;
  registry: string;
  jobKey: string;
};

export type RecordedEvent = {
  txHash: string;
  blockNumber: string;
  blockTime?: number;
};

const LOGS_RANGE = 10_000; // RPC limit per eth_getLogs call
const LOGS_MAX_CHUNKS = 24; // scan back ~240k blocks, then give up gracefully
const LOGS_PARALLEL = 6;

async function rpcCall(method: string, params: unknown[], id: number): Promise<any> {
  const res = await fetch(NETWORK.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: any; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "rpc error");
  return json.result;
}

/**
 * Find the single Recorded(actionHash) log for this receipt and return the
 * recording transaction hash + block number (+ block timestamp when readable).
 * The registry reverts AlreadyRecorded on duplicates, so there is at most one.
 * The RPC caps eth_getLogs at 10k blocks, so we scan backwards from the tip in
 * bounded chunks — recent receipts resolve in one batch, old ones degrade
 * gracefully to null. Never throws — returns null when the RPC cannot answer.
 */
export async function readRecordedEvent(actionHash: string): Promise<RecordedEvent | null> {
  const hash = actionHash.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return null;
  try {
    const topic0 = keccak256(
      toBytes("Recorded(bytes32,address,address,address,uint256,uint256)"),
    );
    const topic1 = `0x${hash.slice(2).toLowerCase().padStart(64, "0")}`;
    const tipHex = (await rpcCall("eth_blockNumber", [], 1)) as string;
    const tip = BigInt(tipHex);
    const chunks: Array<{ from: string; to: string }> = [];
    for (let i = 0; i < LOGS_MAX_CHUNKS; i += 1) {
      const to = tip - BigInt(i * LOGS_RANGE);
      if (to < 0n) break;
      const from = to - BigInt(LOGS_RANGE - 1) < 0n ? 0n : to - BigInt(LOGS_RANGE - 1);
      chunks.push({ from: `0x${from.toString(16)}`, to: `0x${to.toString(16)}` });
      if (from === 0n) break;
    }
    let found: { transactionHash?: string; blockNumber?: string } | null = null;
    for (let b = 0; b < chunks.length && !found; b += LOGS_PARALLEL) {
      const batch = chunks.slice(b, b + LOGS_PARALLEL);
      const results = await Promise.all(
        batch.map((c, k) =>
          rpcCall(
            "eth_getLogs",
            [
              {
                address: [...RECEIPT_REGISTRIES],
                topics: [topic0, topic1],
                fromBlock: c.from,
                toBlock: c.to,
              },
            ],
            100 + b + k,
          ).catch(() => null),
        ),
      );
      for (const logs of results) {
        const log = (logs as Array<{ transactionHash?: string; blockNumber?: string }> | null)?.[0];
        if (log?.transactionHash && log?.blockNumber) {
          found = log;
          break;
        }
      }
    }
    if (!found) return null;
    const out: RecordedEvent = {
      txHash: found.transactionHash as string,
      blockNumber: BigInt(found.blockNumber as string).toString(10),
    };
    try {
      const block = (await rpcCall("eth_getBlockByNumber", [found.blockNumber, false], 2)) as {
        timestamp?: string;
      } | null;
      if (block?.timestamp) out.blockTime = Number(BigInt(block.timestamp)) * 1000;
    } catch {
      /* timestamp is a nicety, not a requirement */
    }
    return out;
  } catch {
    return null;
  }
}

export type ApiReceipt = {
  exists?: boolean;
  storageRoot?: string;
  teeSigner?: string;
  quoteHash?: string;
  allowed?: boolean;
} | null;

/** Same encoding as the API settler: sha256(utf8 job UUID) → bytes32. */
export function jobIdBytes32(jobId: string): Hex {
  const v = jobId.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) return v.toLowerCase() as Hex;
  return sha256(toBytes(v));
}

/** Same encoding as the settler: keccak256(utf8 chatId). */
export function chatIdHashFromPlain(chatId: string): Hex {
  return keccak256(toBytes(chatId));
}

export function compareChatIdHash(
  plain?: string | null,
  onchain?: string | null,
): { match: boolean | null; note: string } {
  if (!plain) {
    return { match: null, note: "No chatId on the job. This browser cannot recompute the registry hash." };
  }
  if (!onchain) {
    return { match: null, note: "No registry chatIdHash yet." };
  }
  const local = chatIdHashFromPlain(plain);
  if (local.toLowerCase() === onchain.toLowerCase()) {
    return { match: true, note: "Browser keccak256(utf8 chatId) matches the registry chatIdHash." };
  }
  return {
    match: false,
    note: "Browser keccak256(utf8 chatId) does not match the registry. Registry wins.",
  };
}

function norm(value?: string | boolean | null): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "").toLowerCase();
}

export function compareReceipts(
  api: ApiReceipt,
  browser: BrowserReceipt,
): { match: boolean | null; note: string } {
  if (!browser.exists && !api?.exists) {
    return { match: null, note: "No registry row from live RPC yet." };
  }
  if (browser.exists && !api?.exists) {
    return { match: false, note: "Live RPC has a registry row. API did not. Registry wins." };
  }
  if (!browser.exists && api?.exists) {
    return { match: false, note: "API claims a registry row. Live RPC does not. Registry (RPC) wins." };
  }
  const fields: Array<keyof Pick<BrowserReceipt, "storageRoot" | "quoteHash" | "allowed" | "teeSigner">> = [
    "storageRoot",
    "quoteHash",
    "allowed",
    "teeSigner",
  ];
  const mismatch = fields.filter((f) => norm(api?.[f] as string | boolean | undefined) !== norm(browser[f]));
  if (mismatch.length) {
    return {
      match: false,
      note: `Live RPC disagrees with API on ${mismatch.join(", ")}. Registry wins.`,
    };
  }
  return { match: true, note: "Browser eth_call matches the API decode of the same registry." };
}

const ARC_RECEIPT_ABI = [
  {
    type: "function",
    name: "receipts",
    stateMutability: "view",
    inputs: [{ name: "actionHash", type: "bytes32" }],
    outputs: [
      { name: "vault", type: "address" },
      { name: "agent", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
  },
] as const;

export type ArcChainReceipt = {
  exists: boolean;
  vault?: string;
  agent?: string;
  recipient?: string;
  amount?: string;
  nonce?: string;
  rpc: string;
  registry: string;
  actionHash: string;
};

/** Read BeaconReceiptRegistry.receipts(actionHash) from Arc: V2 first, then V1. */
export async function readArcReceipt(actionHash: string): Promise<ArcChainReceipt> {
  const hash = actionHash.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error("An Arc receipt is a 32-byte action hash.");
  }
  let last: ArcChainReceipt | null = null;
  for (const registry of RECEIPT_REGISTRIES) {
    const data = encodeFunctionData({
      abi: ARC_RECEIPT_ABI,
      functionName: "receipts",
      args: [hash as Hex],
    });
    const res = await fetch(NETWORK.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: registry, data }, "latest"],
      }),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json()) as { result?: string; error?: { message?: string } };
    if (!json.result) throw new Error(json.error?.message ?? "eth_call empty");
    const decoded = decodeFunctionResult({
      abi: ARC_RECEIPT_ABI,
      functionName: "receipts",
      data: json.result as Hex,
    });
    const exists = Boolean(decoded[5]);
    last = {
      exists,
      vault: exists ? String(decoded[0]) : undefined,
      agent: exists ? String(decoded[1]) : undefined,
      recipient: exists ? String(decoded[2]) : undefined,
      amount: exists ? decoded[3].toString() : undefined,
      nonce: exists ? decoded[4].toString() : undefined,
      rpc: NETWORK.rpc,
      registry,
      actionHash: hash,
    };
    if (exists) return last;
  }
  return last as ArcChainReceipt;
}

export async function readReceiptFromRpc(jobId: string): Promise<BrowserReceipt> {
  const jobKey = jobIdBytes32(jobId);
  const data = encodeFunctionData({ abi: RECEIPTS_ABI, functionName: "receipts", args: [jobKey] });
  const res = await fetch(NETWORK.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: CONTRACTS.jobRegistry, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (!json.result) throw new Error(json.error?.message ?? "eth_call empty");
  const decoded = decodeFunctionResult({
    abi: RECEIPTS_ABI,
    functionName: "receipts",
    data: json.result as Hex,
  });
  const exists = Boolean(decoded[5]);
  return {
    exists,
    storageRoot: exists ? String(decoded[0]) : undefined,
    teeSigner: exists ? String(decoded[1]) : undefined,
    chatIdHash: exists ? String(decoded[2]) : undefined,
    quoteHash: exists ? String(decoded[3]) : undefined,
    allowed: exists ? Boolean(decoded[4]) : undefined,
    recordedAt: exists ? decoded[6].toString() : undefined,
    recorder: exists ? String(decoded[7]) : undefined,
    rpc: NETWORK.rpc,
    registry: CONTRACTS.jobRegistry,
    jobKey,
  };
}
