import { getAddress } from "viem";
import { apiBase } from "./publicEnv";
import { publicClient } from "./wallet";
import { CONTRACTS } from "./chain";
import { readArcReceipt } from "./onchainReceipt";

export type ArcCapability = { executable: boolean; reason?: string };

export type ArcCapabilities = {
  chainId: number;
  send: ArcCapability;
  swap: ArcCapability;
  cctp: ArcCapability;
  privacy: ArcCapability;
  pq: ArcCapability;
  x402: ArcCapability;
  erc8004: ArcCapability;
};

export type ArcVault = {
  vault: string;
  owner: string;
  paused: boolean;
  summary: string;
  maxPerTx: string;
  windowLimit: string;
  windowSpent: string;
  policyVersion: string;
  nonce: string;
  usdcBalance: string;
  executor: string;
  capabilities: ArcCapabilities;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function fetchArcCapabilities(): Promise<ArcCapabilities> {
  return getJson("/v1/capabilities");
}

export type SwapQuote = {
  status: "quoted" | "NO_ROUTE";
  amountIn: string;
  amountOut?: string;
  executable: boolean;
  reason: string;
};

export function fetchSwapQuote(amount = "10000"): Promise<SwapQuote> {
  return readRouterQuote(amount);
}

const v2QuoteAbi = [
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
] as const;

const V2_ROUTER = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa" as const;
const EURC = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1" as const;
const MESSENGER = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d" as const;
const TRANSMITTER = "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64" as const;
const PQ = "0x1800000000000000000000000000000000000004" as const;
const IDENTITY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
const SEND_SELECTOR = "5384627c";
const SWAP_SELECTOR = "38ed1739";

/** Read the router from Arc. This does not send a transaction. */
export async function readRouterQuote(amount = "10000"): Promise<SwapQuote> {
  try {
    const amounts = await publicClient().readContract({
      address: V2_ROUTER,
      abi: v2QuoteAbi,
      functionName: "getAmountsOut",
      args: [BigInt(amount), [CONTRACTS.usdc, EURC]],
    });
    const amountOut = amounts[1].toString();
    if (amountOut === "0") {
      return { status: "NO_ROUTE", amountIn: amount, executable: false, reason: "The router returned no output." };
    }
    return {
      status: "quoted",
      amountIn: amounts[0].toString(),
      amountOut,
      executable: false,
      reason: "The live vault has no swap function. This router read is not a trade.",
    };
  } catch (error) {
    return {
      status: "NO_ROUTE",
      amountIn: amount,
      executable: false,
      reason: error instanceof Error ? error.message : "No route.",
    };
  }
}

const factoryOfAbi = [
  {
    type: "function",
    name: "vaultOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address" }],
  },
] as const;

const vaultViewAbi = [
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "maxPerTx", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "windowLimit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "windowSpent", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "policyVersion", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nonce", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "executor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const balanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const LOCAL_CAPABILITIES: ArcCapabilities = {
  chainId: 5042,
  send: { executable: true },
  swap: { executable: false, reason: "Uniswap V2 can quote USDC to EURC. The deployed vault has no swap function, so Beacon will not trade." },
  cctp: { executable: false, reason: "CCTP contracts are on Arc. This vault cannot burn or mint, so a burn is not a completed bridge." },
  privacy: { executable: false, reason: "Arc Privacy Sector is planned and is not on mainnet. Beacon will not report a private transfer." },
  pq: { executable: false, reason: "The PQ precompile at 0x1800…0004 is 1 byte on mainnet. This is not a PQ wallet." },
  x402: { executable: false, reason: "x402 needs a Circle facilitator key, which is not configured." },
  erc8004: { executable: false, reason: "Registry proxies have code. Beacon has not matched the implementation selectors, so it does not register." },
};

export async function fetchArcVault(owner: string): Promise<ArcVault> {
  const client = publicClient();
  const vault = await client.readContract({
    address: CONTRACTS.vaultFactory,
    abi: factoryOfAbi,
    functionName: "vaultOf",
    args: [owner as `0x${string}`],
  });
  if (vault === "0x0000000000000000000000000000000000000000") {
    throw new Error("This owner has no vault.");
  }
  const [paused, maxPerTx, windowLimit, windowSpent, policyVersion, nonce, executor, usdcBalance] = await Promise.all([
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "paused" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "maxPerTx" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "windowLimit" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "windowSpent" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "policyVersion" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "nonce" }),
    client.readContract({ address: vault, abi: vaultViewAbi, functionName: "executor" }),
    client.readContract({ address: CONTRACTS.usdc, abi: balanceAbi, functionName: "balanceOf", args: [vault] }),
  ]);
  return {
    vault,
    owner,
    paused,
    summary: `${usdc(usdcBalance.toString())} in the vault`,
    maxPerTx: maxPerTx.toString(),
    windowLimit: windowLimit.toString(),
    windowSpent: windowSpent.toString(),
    policyVersion: policyVersion.toString(),
    nonce: nonce.toString(),
    usdcBalance: usdcBalance.toString(),
    executor,
    capabilities: LOCAL_CAPABILITIES,
  };
}

const KNOWN_RECEIPT = "0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a";
const KNOWN_SEND = "0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab";
const KNOWN_OVER_CAP = "0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83";
const SITE = "https://beacon-arc-one.vercel.app";
const EXPLORER = "https://explorer.arc.io";

const grantViewAbi = [
  {
    type: "function",
    name: "grants",
    stateMutability: "view",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [
      { name: "agent", type: "address" },
      { name: "maxPerTx", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "scopes", type: "uint8" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

const allowedEvent = {
  type: "event",
  name: "RecipientAllowed",
  inputs: [
    { name: "recipient", type: "address", indexed: false },
    { name: "allowed", type: "bool", indexed: false },
  ],
} as const;

export type FlowGrant = {
  agent: string;
  maxPerTx: string;
  expiry: number;
  scopes: number;
  active: boolean;
};

export async function readFlowGrant(vault: string, grantId = 1n): Promise<FlowGrant> {
  const row = await publicClient().readContract({
    address: vault as `0x${string}`,
    abi: grantViewAbi,
    functionName: "grants",
    args: [grantId],
  });
  return {
    agent: row[0],
    maxPerTx: row[1].toString(),
    expiry: Number(row[2]),
    scopes: Number(row[3]),
    active: Boolean(row[4]),
  };
}

export async function readAllowedRecipients(vault: string): Promise<string[]> {
  const client = publicClient();
  const latest = await client.getBlockNumber();
  const first = 24_848_337n;
  const chunk = 4_000n;
  const ranges: Array<[bigint, bigint]> = [[first, first + chunk - 1n > latest ? latest : first + chunk - 1n]];
  const recentFrom = latest > chunk * 3n ? latest - chunk * 3n + 1n : first;
  if (recentFrom > ranges[0][1]) {
    for (let from = recentFrom; from <= latest; from += chunk) {
      ranges.push([from, from + chunk - 1n > latest ? latest : from + chunk - 1n]);
    }
  }
  const parts = await Promise.all(
    ranges.map(([from, to]) =>
      client.getLogs({
        address: vault as `0x${string}`,
        event: allowedEvent,
        fromBlock: from,
        toBlock: to,
      }),
    ),
  );
  const state = new Map<string, boolean>();
  for (const log of parts.flat()) {
    if (log.args.recipient) state.set(log.args.recipient, Boolean(log.args.allowed));
  }
  return [...state.entries()].filter(([, allowed]) => allowed).map(([recipient]) => recipient);
}

const domainAbi = [
  { type: "function", name: "localDomain", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
] as const;

export type FlowReceipt = {
  exists: boolean;
  vault?: string;
  agent?: string;
  recipient?: string;
  amount?: string;
  nonce?: string;
};

export type FlowRail = {
  block: string;
  routerBytes?: number;
  vaultBytes?: number;
  vaultHasSend?: boolean;
  vaultHasSwap?: boolean;
  messengerBytes?: number;
  transmitterBytes?: number;
  domain?: number | null;
  pqBytes?: number;
  identityBytes?: number;
  identityImpl?: string | null;
  implBytes?: number;
  receipt?: FlowReceipt | null;
  overCapStatus?: "reverted" | "success" | "missing";
  capabilityReason?: string;
};

function byteLength(code?: string | null): number {
  if (!code || code === "0x") return 0;
  return (code.length - 2) / 2;
}

function hasSelector(code: string | undefined, selector: string): boolean {
  return Boolean(code && code.toLowerCase().includes(selector));
}

function slotAddress(slot?: string | null): string | null {
  if (!slot || slot === `0x${"0".repeat(64)}`) return null;
  const raw = `0x${slot.slice(-40)}`;
  try {
    return getAddress(raw);
  } catch {
    return raw;
  }
}

export function answerFlow(
  prompt: string,
  read: {
    vault: ArcVault | null;
    ownerConnected: boolean;
    wallet?: string | null;
    quote?: { status: string; amountOut?: string } | null;
    grant?: FlowGrant | null;
    allowed?: string[] | null;
    rail?: FlowRail | null;
  },
): string {
  const q = prompt.toLowerCase();
  const vault = read.vault;
  const head = vault
    ? [
        "## Vault",
        `- Balance: ${vault.summary.replace(" in the vault", "")}`,
        `- Vault: \`${vault.vault}\``,
        `- Owner: \`${vault.owner}\``,
        `- Executor: \`${vault.executor}\``,
        `- Policy v${vault.policyVersion}. Nonce ${vault.nonce}.`,
        `- Cap ${usdc(vault.maxPerTx)} per send. Window ${usdc(vault.windowLimit)}. Spent ${usdc(vault.windowSpent)}.`,
        vault.paused ? "- The vault is paused." : "- The vault is active.",
        `- Explorer: ${EXPLORER}/address/${vault.vault}`,
      ].join("\n")
    : read.ownerConnected
      ? "This wallet has no vault on the factory. Create is the only next step, and a second create reverts once one exists."
      : "Connect a wallet. Beacon reads that wallet's vault from the factory.";

  const rail = read.rail;
  const blockLine = rail?.block ? `Read at block ${rail.block}.` : "";

  if (q.includes("swap")) {
    const quoted = read.quote?.status === "quoted" && read.quote.amountOut
      ? `getAmountsOut(10000, [USDC, EURC]) returned ${read.quote.amountOut} EURC base units.`
      : "getAmountsOut for 10000 USDC base units returned no output.";
    const bytecode = rail?.vaultBytes != null
      ? `Vault bytecode is ${rail.vaultBytes} bytes. It ${rail.vaultHasSend ? "contains" : "does not contain"} executeSend \`${SEND_SELECTOR}\` and ${rail.vaultHasSwap ? "contains" : "does not contain"} swapExactTokensForTokens \`${SWAP_SELECTOR}\`.`
      : "The vault bytecode was not read, so Beacon will not claim a swap function.";
    return [
      "## Swap quote",
      blockLine,
      `- Router \`${V2_ROUTER}\`${rail?.routerBytes != null ? ` is ${rail.routerBytes} bytes` : ""}.`,
      `- ${quoted}`,
      "- Path: USDC `0x3600000000000000000000000000000000000000` to EURC `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1`.",
      bytecode,
      "Beacon will not send a swap. This quote is not a fill.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("cctp") || q.includes("bridge")) {
    const domain = rail?.domain == null ? "localDomain() was not read." : `MessageTransmitterV2 localDomain() returned ${rail.domain}.`;
    return [
      "## CCTP",
      blockLine,
      `- TokenMessengerV2 \`${MESSENGER}\`${rail?.messengerBytes != null ? ` is ${rail.messengerBytes} bytes` : ""}.`,
      `- MessageTransmitterV2 \`${TRANSMITTER}\`${rail?.transmitterBytes != null ? ` is ${rail.transmitterBytes} bytes` : ""}. ${domain}`,
      "This vault has no burn or mint function. A burn is not a completed bridge, so Beacon will not start one.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("private")) {
    return [
      "## Privacy",
      blockLine,
      "Arc's published mainnet address list has no Privacy Sector contract to call.",
      "https://docs.arc.io/arc/concepts/opt-in-privacy",
      "Beacon will not report a private transfer.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("pq")) {
    const size = rail?.pqBytes == null
      ? "The precompile bytecode was not read."
      : `That address is ${rail.pqBytes} ${rail.pqBytes === 1 ? "byte" : "bytes"} of code on this read.`;
    return [
      "## Post-quantum",
      blockLine,
      `- PQ verify precompile \`${PQ}\`.`,
      size,
      rail?.pqBytes === 1
        ? "A 1-byte precompile is not a signer. This wallet does not produce a PQ signature."
        : "Beacon will not treat this precompile as a signer until its ABI is pinned.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("x402")) {
    return [
      "## x402",
      blockLine,
      read.rail?.capabilityReason || "x402 needs a Circle facilitator key and a payment proof.",
      "No facilitator key is configured, so there is no payment proof and nothing is marked settled.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("8004")) {
    const impl = rail?.identityImpl
      ? `EIP-1967 implementation \`${rail.identityImpl}\`${rail.implBytes != null ? ` is ${rail.implBytes} bytes` : ""}.`
      : "The EIP-1967 implementation slot was not read.";
    return [
      "## ERC-8004",
      blockLine,
      `- Identity proxy \`${IDENTITY}\`${rail?.identityBytes != null ? ` is ${rail.identityBytes} bytes` : ""}.`,
      impl,
      "Beacon has not matched register selectors on that implementation and has not registered an agent. The old 0G agent id is not reused.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("verify") || q.includes("receipt")) {
    const row = rail?.receipt;
    const body = row?.exists
      ? [
          `Registry receipts(\`${KNOWN_RECEIPT}\`) exists.`,
          `- Vault \`${row.vault}\``,
          `- Agent \`${row.agent}\``,
          `- Recipient \`${row.recipient}\``,
          `- Amount ${row.amount ? usdc(row.amount) : "unread"}, ${row.amount ?? "unread"} base units. Nonce ${row.nonce ?? "unread"}.`,
        ]
      : ["The registry read did not return a receipt row. Beacon will not invent one."];
    return [
      "## Receipt",
      blockLine,
      ...body,
      `- Verify: ${SITE}/verify/${KNOWN_RECEIPT}`,
      `- Transaction: ${EXPLORER}/tx/${KNOWN_SEND}`,
      "A page that is not a 32-byte action hash is not a receipt.",
    ].filter(Boolean).join("\n");
  }
  if (q.includes("pause")) {
    return vault
      ? [
          "## Pause",
          `Only owner \`${vault.owner}\` can pause or resume.`,
          `Executor \`${vault.executor}\` cannot change policy or pause.`,
          vault.paused ? "The vault is paused." : "The vault is active.",
          `The owner button is on ${SITE}/flow/desk`,
        ].join("\n")
      : "Only the vault owner can pause. Connect that wallet to read the pause state.";
  }
  if (q.includes("cap")) {
    const over = rail?.overCapStatus
      ? `- Over-cap transaction ${KNOWN_OVER_CAP} status on this read: ${rail.overCapStatus}. ${EXPLORER}/tx/${KNOWN_OVER_CAP}`
      : `- Over-cap transaction: ${EXPLORER}/tx/${KNOWN_OVER_CAP}`;
    return [
      "## Cap",
      blockLine,
      vault ? `- Per send: ${usdc(vault.maxPerTx)}` : "- Connect a wallet to read this vault's cap.",
      vault ? `- Window: ${usdc(vault.windowLimit)}` : "",
      vault ? `- Spent in the window: ${usdc(vault.windowSpent)}` : "",
      "A larger send reverts and does not move USDC. The nonce does not advance on that revert.",
      over,
    ].filter(Boolean).join("\n");
  }
  if (q.includes("send") || q.includes("prepare")) {
    const grant = read.grant;
    const walletIsAgent = Boolean(
      read.wallet && grant?.active && grant.agent !== "0x0000000000000000000000000000000000000000" && read.wallet.toLowerCase() === grant.agent.toLowerCase(),
    );
    const lines = ["## Send", head];
    if (grant?.active && grant.agent !== "0x0000000000000000000000000000000000000000") {
      lines.push(`- Grant 1 agent: \`${grant.agent}\``);
      lines.push(`- Grant max ${usdc(grant.maxPerTx)}. Scope ${grant.scopes}. Expires ${new Date(grant.expiry * 1000).toISOString()}.`);
      lines.push(walletIsAgent
        ? "This wallet is that agent. Open the vault, unlock the browser session, and sign the exact action."
        : "This wallet is not that agent. Beacon will not ask it to sign the send.");
    } else {
      lines.push("Grant 1 has no active agent. The owner registers one on the vault page. An empty agent field does not use this wallet.");
    }
    lines.push(`- Vault form: ${SITE}/flow/desk`);
    lines.push("This chat does not sign and does not move USDC.");
    return lines.join("\n");
  }
  if (q.includes("who can") || (q.includes("allow") && !q.includes("send"))) {
    const listed = read.allowed ?? [];
    return [
      "## Allowlist",
      listed.length
        ? listed.map((addr) => `- \`${addr}\` is allowed`).join("\n")
        : "- No RecipientAllowed log was found in the vault's first blocks or the latest window.",
      "An empty address does not broadcast. A blocked recipient reverts.",
      vault ? `- Vault: ${EXPLORER}/address/${vault.vault}` : "",
    ].filter(Boolean).join("\n");
  }
  return `${head}\nThis chat reads Arc and does not move USDC.`;
}

export async function answerLiveFlow(prompt: string, wallet: string | null): Promise<string> {
  const q = prompt.toLowerCase();
  const vault = wallet ? await fetchArcVault(wallet).catch(() => null) : null;
  const client = publicClient();
  const wantSwap = q.includes("swap");
  const wantCctp = q.includes("cctp") || q.includes("bridge");
  const wantPq = q.includes("pq");
  const wantErc = q.includes("8004");
  const wantVerify = q.includes("verify") || q.includes("receipt");
  const wantCap = q.includes("cap");
  const wantX402 = q.includes("x402");
  const wantGrant = /send|prepare|vault|policy|pause|cap/.test(q);
  const wantAllow = q.includes("who can") || (q.includes("allow") && !q.includes("send") && !q.includes("prepare"));
  const vaultAddress = (vault?.vault ?? CONTRACTS.vault) as `0x${string}`;

  const [block, quote, grant, allowed, routerCode, vaultCode, messengerCode, transmitterCode, domain, pqCode, identityCode, implSlot, receipt, overCap, capabilities] = await Promise.all([
    client.getBlockNumber().catch(() => null),
    wantSwap ? readRouterQuote("10000") : Promise.resolve(null),
    vault && wantGrant ? readFlowGrant(vault.vault).catch(() => null) : Promise.resolve(null),
    vault && wantAllow ? readAllowedRecipients(vault.vault).catch(() => []) : Promise.resolve(null),
    wantSwap ? client.getBytecode({ address: V2_ROUTER }).catch(() => undefined) : Promise.resolve(undefined),
    wantSwap ? client.getBytecode({ address: vaultAddress }).catch(() => undefined) : Promise.resolve(undefined),
    wantCctp ? client.getBytecode({ address: MESSENGER }).catch(() => undefined) : Promise.resolve(undefined),
    wantCctp ? client.getBytecode({ address: TRANSMITTER }).catch(() => undefined) : Promise.resolve(undefined),
    wantCctp ? client.readContract({ address: TRANSMITTER, abi: domainAbi, functionName: "localDomain" }).catch(() => null) : Promise.resolve(null),
    wantPq ? client.getBytecode({ address: PQ }).catch(() => undefined) : Promise.resolve(undefined),
    wantErc ? client.getBytecode({ address: IDENTITY }).catch(() => undefined) : Promise.resolve(undefined),
    wantErc ? client.getStorageAt({ address: IDENTITY, slot: IMPL_SLOT }).catch(() => undefined) : Promise.resolve(undefined),
    wantVerify ? readArcReceipt(KNOWN_RECEIPT).catch(() => null) : Promise.resolve(null),
    wantCap ? client.getTransactionReceipt({ hash: KNOWN_OVER_CAP as `0x${string}` }).catch(() => null) : Promise.resolve(null),
    wantX402 ? fetchArcCapabilities().catch(() => null) : Promise.resolve(null),
  ]);

  const identityImpl = slotAddress(implSlot);
  const implBytes = identityImpl
    ? byteLength(await client.getBytecode({ address: identityImpl as `0x${string}` }).catch(() => undefined))
    : undefined;

  const rail: FlowRail = { block: block == null ? "" : block.toString() };
  if (wantSwap) {
    rail.routerBytes = byteLength(routerCode);
    rail.vaultBytes = byteLength(vaultCode);
    rail.vaultHasSend = hasSelector(vaultCode, SEND_SELECTOR);
    rail.vaultHasSwap = hasSelector(vaultCode, SWAP_SELECTOR);
  }
  if (wantCctp) {
    rail.messengerBytes = byteLength(messengerCode);
    rail.transmitterBytes = byteLength(transmitterCode);
    rail.domain = domain == null ? null : Number(domain);
  }
  if (wantPq) rail.pqBytes = byteLength(pqCode);
  if (wantErc) {
    rail.identityBytes = byteLength(identityCode);
    rail.identityImpl = identityImpl;
    rail.implBytes = implBytes;
  }
  if (wantVerify && receipt) {
    rail.receipt = {
      exists: receipt.exists,
      vault: receipt.vault,
      agent: receipt.agent,
      recipient: receipt.recipient,
      amount: receipt.amount,
      nonce: receipt.nonce,
    };
  }
  if (wantCap) {
    rail.overCapStatus = overCap?.status === "reverted" ? "reverted" : overCap?.status === "success" ? "success" : "missing";
  }
  if (wantX402) rail.capabilityReason = capabilities?.x402.reason;

  return answerFlow(prompt, {
    vault,
    ownerConnected: Boolean(wallet),
    wallet,
    quote,
    grant,
    allowed,
    rail,
  });
}

const CAPABILITY_NAMES = ["send", "swap", "cctp", "privacy", "pq", "x402", "erc8004"] as const;

function usdc(raw: string): string {
  const n = BigInt(raw);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac} USDC` : `${whole} USDC`;
}

export async function readArcDesk(owner?: string | null): Promise<{
  capabilities: ArcCapabilities;
  vault: ArcVault | null;
}> {
  const capabilities = await fetchArcCapabilities();
  if (!owner) return { capabilities, vault: null };
  try {
    return { capabilities, vault: await fetchArcVault(owner) };
  } catch {
    return { capabilities, vault: null };
  }
}

/** Words taken from the live capability and vault responses. */
export function describeArc(read: {
  capabilities: ArcCapabilities;
  vault: ArcVault | null;
  ownerConnected: boolean;
}): string {
  const lines = [`Arc chain ${read.capabilities.chainId}.`];
  if (read.vault) {
    lines.push(read.vault.summary);
    lines.push(
      `Cap ${usdc(read.vault.maxPerTx)} per send. Window ${usdc(read.vault.windowLimit)}. Spent ${usdc(read.vault.windowSpent)}. Nonce ${read.vault.nonce}. Policy v${read.vault.policyVersion}.`,
    );
    lines.push(read.vault.paused ? "The vault is paused." : "The vault is active.");
  } else if (read.ownerConnected) {
    lines.push("This wallet has no vault.");
  } else {
    lines.push("Connect a wallet to read its vault.");
  }
  for (const name of CAPABILITY_NAMES) {
    const cap = read.capabilities[name];
    lines.push(cap.executable ? `${name}: live.` : `${name}: off. ${cap.reason ?? ""}`.trim());
  }
  lines.push("This desk does not quote a compute job and does not move USDC.");
  return lines.join(" ");
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error?.message || text || `Request failed (${res.status})`);
  return data as T;
}

export function requestSessionChallenge(address: string) {
  return postJson<{ message: string; expiresAt: number }>("/v1/auth/challenge", { address });
}

export function verifySession(address: string, signature: string) {
  return postJson<{ token: string }>("/v1/auth/verify", { address, signature });
}

export function createApiGrant(token: string, agent: string, maxPerTx: string) {
  return postJson<{ bearer: string; scopes: string[]; maxPerTx: string }>("/v1/grants", { agent, maxPerTx }, token);
}

export async function revokeApiGrant(token: string, bearer: string) {
  try {
    return await postJson<{ revoked: boolean }>("/v1/grants/revoke", { bearer }, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404/i.test(message)) {
      throw new Error("This API does not revoke bearers yet. The on-chain grant is unchanged.");
    }
    throw error;
  }
}

export type PreparedSend = {
  summary: string;
  note: string;
  typedData: {
    domain: { name: string; version: string; chainId: number; verifyingContract: `0x${string}` };
    types: { Action: { name: string; type: string }[] };
    primaryType: "Action";
    message: Record<string, string | number>;
  };
};

export function prepareSend(token: string, body: { grantId: string; agent: string; recipient: string; amount: string; deadline: string }) {
  return postJson<PreparedSend>("/v1/vault/prepare-send", body, token);
}

export function executeSignedSend(token: string, action: Record<string, string>, signature: string) {
  return postJson<{ actionHash: string; txHash: string; duplicate: boolean }>("/v1/vault/execute-send", { action, signature }, token);
}
