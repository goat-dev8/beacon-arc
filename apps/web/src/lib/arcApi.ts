import { apiBase } from "./publicEnv";
import { publicClient } from "./wallet";
import { CONTRACTS } from "./chain";

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

export function answerFlow(
  prompt: string,
  read: {
    vault: ArcVault | null;
    ownerConnected: boolean;
    quote?: { status: string; amountOut?: string } | null;
  },
): string {
  const q = prompt.toLowerCase();
  const vault = read.vault;
  const head = vault
    ? `${vault.summary}. Vault ${vault.vault}. Policy v${vault.policyVersion}. Nonce ${vault.nonce}. Cap ${usdc(vault.maxPerTx)} per send. Window ${usdc(vault.windowLimit)}. ${vault.paused ? "The vault is paused." : "The vault is active."}`
    : read.ownerConnected
      ? "This wallet has no vault on the factory."
      : "Connect a wallet to read its vault.";

  if (q.includes("swap")) {
    const quoted = read.quote?.status === "quoted" && read.quote.amountOut
      ? `Uniswap V2 quotes 0.01 USDC as ${read.quote.amountOut} EURC base units.`
      : "Uniswap V2 returned no route for 0.01 USDC.";
    return `${quoted} The live vault only has executeSend, so Beacon will not trade.`;
  }
  if (q.includes("cctp") || q.includes("bridge")) {
    return "CCTP is on Arc as domain 26. TokenMessengerV2 is 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d. This vault cannot burn or mint, so Beacon will not call a burn a completed bridge.";
  }
  if (q.includes("private")) {
    return "Arc Privacy Sector is planned and is not on mainnet. Beacon will not report a private transfer.";
  }
  if (q.includes("pq")) {
    return "Arc lists a PQ signature-verify precompile at 0x1800…0004. On mainnet that address is 1 byte of code. This wallet is not a PQ wallet.";
  }
  if (q.includes("x402")) {
    return "x402 needs a Circle facilitator key. None is configured, so there is no payment proof and nothing is marked settled.";
  }
  if (q.includes("8004")) {
    return "ERC-8004 registry proxies are on Arc. Beacon has not matched their implementation selectors and has not registered an agent.";
  }
  if (q.includes("verify") || q.includes("receipt")) {
    return `The recorded send is 0.01 USDC, 10000 base units. Receipt ${KNOWN_RECEIPT}. Transaction ${KNOWN_SEND}. Open /verify/${KNOWN_RECEIPT}.`;
  }
  if (q.includes("pause")) {
    return vault
      ? `Only the owner can pause or resume. The executor cannot. ${vault.paused ? "The vault is paused." : "The vault is active."} Owner ${vault.owner}.`
      : "Only the vault owner can pause. Connect that wallet to read the pause state.";
  }
  if (q.includes("cap")) {
    return vault
      ? `The cap is ${usdc(vault.maxPerTx)} per send and ${usdc(vault.windowLimit)} per window. A larger send reverts and does not move USDC. Over-cap transaction ${KNOWN_OVER_CAP}.`
      : "A send above the vault cap reverts. Connect a wallet to read this cap.";
  }
  if (q.includes("allow") || q.includes("pay")) {
    return "The owner allowlist and blocklist decide who can be paid. An empty address does not broadcast. The recorded send paid the owner.";
  }
  if (q.includes("send") || q.includes("prepare")) {
    return `${head} Only the registered agent wallet can sign a send. This chat does not sign and does not move USDC.`;
  }
  return `${head} This chat reads Arc and does not move USDC.`;
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
