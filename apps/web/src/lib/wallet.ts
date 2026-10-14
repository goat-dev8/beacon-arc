import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  http,
  parseAbi,
  sha256,
  toBytes,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { NETWORK } from "./chain";
import { aristotleEip1559Fees } from "./aristotleFees";

const aristotle = {
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [NETWORK.rpc] } },
} as const;

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function asEip1193(value: unknown): Eip1193Provider | undefined {
  if (
    value &&
    typeof value === "object" &&
    "request" in value &&
    typeof (value as Eip1193Provider).request === "function"
  ) {
    return value as Eip1193Provider;
  }
  return undefined;
}

/** Active provider from Reown / wagmi connector (injected or WalletConnect). */
let activeEip1193: Eip1193Provider | undefined;

export function setEip1193Provider(provider: Eip1193Provider | null | undefined): void {
  activeEip1193 = provider ?? undefined;
}

export function getEip1193Provider(): Eip1193Provider | undefined {
  if (activeEip1193) return activeEip1193;
  if (typeof window === "undefined") return undefined;
  return asEip1193((window as Window & { ethereum?: unknown }).ethereum);
}

/**
 * Reown AppKit is always available — users can pick MetaMask, Rabby, WC, etc.
 * Kept for call sites that previously gated on injected `window.ethereum`.
 */
export function hasEvmProvider(): boolean {
  return typeof window !== "undefined";
}

export async function ensureArcNetwork(): Promise<void> {
  await ensureChain({
    chainId: NETWORK.chainId,
    name: NETWORK.name,
    rpc: NETWORK.rpc,
    explorer: NETWORK.explorer,
    nativeName: "USDC",
    nativeSymbol: "USDC",
  });
}

/**
 * Beacon jobs, Safe, and Zia stay on Arc. Other chains are refused here.
 * LI.FI source-chain signing uses `ensureSourceChain` instead.
 */
export async function ensureForeignMainnet(): Promise<void> {
  throw new Error("Beacon stays on Arc (chain 5042). Other networks are disabled.");
}

const SOURCE_CHAINS: Record<
  number,
  { name: string; rpc: string; explorer: string; nativeName: string; nativeSymbol: string }
> = {
  8453: {
    name: "Base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    nativeName: "Ether",
    nativeSymbol: "ETH",
  },
  1: {
    name: "Ethereum",
    rpc: "https://cloudflare-eth.com",
    explorer: "https://etherscan.io",
    nativeName: "Ether",
    nativeSymbol: "ETH",
  },
};

/**
 * Narrow switch for a live LI.FI quote. Only Base (8453) and Ethereum (1).
 * Always switch back to Arc after the source tx is submitted.
 */
export async function ensureSourceChain(chainId: number): Promise<void> {
  const meta = SOURCE_CHAINS[chainId];
  if (!meta) {
    throw new Error(`Beacon will not switch to unsupported source chain ${chainId}.`);
  }
  await ensureChain({
    chainId,
    name: meta.name,
    rpc: meta.rpc,
    explorer: meta.explorer,
    nativeName: meta.nativeName,
    nativeSymbol: meta.nativeSymbol,
  });
}

export type LifiBridgeStep =
  | { step: "approve"; status: "pending" | "confirmed" | "skipped"; hash?: Hex }
  | { step: "send"; status: "pending" | "confirmed" | "failed"; hash?: Hex; error?: string };

/**
 * User-wallet source-chain tx from a live LI.FI transactionRequest.
 * Beacon Safe cannot sign this. Status tracking is a separate LI.FI poll.
 */
export async function executeLifiBridge(params: {
  transactionRequest: { to: string; data: Hex; value: string; chainId: number };
  approvalAddress?: string | null;
  fromToken?: string;
  fromAmount?: string;
  onStep?: (s: LifiBridgeStep) => void;
}): Promise<{ sourceHash: Hex; approveHash?: Hex }> {
  const tx = params.transactionRequest;
  if (!tx.to || !tx.data) {
    throw new Error("LI.FI did not return an executable transactionRequest.");
  }
  await ensureSourceChain(tx.chainId);
  const eth = getEip1193Provider();
  if (!eth) throw new Error("No wallet connected. Tap Connect and pick a wallet.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("Wallet returned no account.");

  let approveHash: Hex | undefined;
  const nativeToken = !params.fromToken || /^0x0+$/i.test(params.fromToken);
  if (!nativeToken && params.approvalAddress && params.fromToken && params.fromAmount) {
    const spender = getAddress(params.approvalAddress);
    const token = getAddress(params.fromToken);
    const amount = BigInt(params.fromAmount);
    const allowanceData = encodeFunctionData({
      abi: parseAbi(["function allowance(address owner, address spender) view returns (uint256)"]),
      functionName: "allowance",
      args: [getAddress(from), spender],
    });
    const raw = (await eth.request({
      method: "eth_call",
      params: [{ to: token, data: allowanceData }, "latest"],
    })) as string;
    const allowance = BigInt(raw || "0x0");
    if (allowance < amount) {
      params.onStep?.({ step: "approve", status: "pending" });
      const approveData = encodeFunctionData({
        abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
        functionName: "approve",
        args: [spender, amount],
      });
      approveHash = (await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: token, data: approveData }],
      })) as Hex;
      params.onStep?.({ step: "approve", status: "confirmed", hash: approveHash });
    } else {
      params.onStep?.({ step: "approve", status: "skipped" });
    }
  }

  params.onStep?.({ step: "send", status: "pending" });
  try {
    const sourceHash = (await eth.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tx.to,
          data: tx.data,
          value: tx.value && tx.value !== "0" ? tx.value : "0x0",
        },
      ],
    })) as Hex;
    params.onStep?.({ step: "send", status: "confirmed", hash: sourceHash });
    try {
      await ensureArcNetwork();
    } catch {
      /* source tx already sent; Flow can continue even if the switch-back is rejected */
    }
    return { sourceHash, approveHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Source-chain bridge tx failed.";
    params.onStep?.({ step: "send", status: "failed", error: message });
    try {
      await ensureArcNetwork();
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

async function ensureChain(params: {
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  nativeName: string;
  nativeSymbol: string;
}): Promise<void> {
  const eth = getEip1193Provider();
  if (!eth) throw new Error("No wallet connected. Tap Connect and pick a wallet.");
  const targetHex = `0x${params.chainId.toString(16)}` as Hex;
  const chainIdHex = (await eth.request({ method: "eth_chainId" })) as Hex;
  if (parseInt(chainIdHex, 16) === params.chainId) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
    return;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err ? Number((err as { code: number }).code) : undefined;
    if (code !== 4902 && code !== -32603) {
      throw new Error(`Switch your wallet to ${params.name} (chain ${params.chainId}).`);
    }
  }

  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: targetHex,
        chainName: params.name,
        nativeCurrency: { name: params.nativeName, symbol: params.nativeSymbol, decimals: 18 },
        rpcUrls: [params.rpc],
        blockExplorerUrls: [params.explorer],
      },
    ],
  });
  await eth.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: targetHex }],
  });
}

/**
 * Connect via injected provider when already available.
 * Prefer `useProductWallet().connect()` (Reown modal) for multi-wallet UX.
 */
export async function connectEvmWallet(): Promise<Address> {
  const eth = getEip1193Provider();
  if (!eth) throw new Error("No wallet connected. Tap Connect and pick a wallet.");
  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts[0]) throw new Error("Wallet returned no account.");
  await ensureArcNetwork();
  const addr = getAddress(accounts[0]);
  try {
    localStorage.setItem("beacon.wallet", addr);
  } catch {
    /* ignore */
  }
  return addr;
}

/** Soft restore — eth_accounts (no popup) if previously connected. */
export async function tryRestoreWallet(): Promise<Address | null> {
  const eth = getEip1193Provider();
  if (!eth) {
    try {
      const cached = localStorage.getItem("beacon.wallet");
      return cached && /^0x[a-fA-F0-9]{40}$/.test(cached) ? getAddress(cached) : null;
    } catch {
      return null;
    }
  }
  try {
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    if (!accounts[0]) {
      const cached = localStorage.getItem("beacon.wallet");
      return cached && /^0x[a-fA-F0-9]{40}$/.test(cached) ? getAddress(cached) : null;
    }
    await ensureArcNetwork();
    const addr = getAddress(accounts[0]);
    localStorage.setItem("beacon.wallet", addr);
    return addr;
  } catch {
    return null;
  }
}

export function walletClient() {
  const eth = getEip1193Provider();
  if (!eth) throw new Error("No wallet connected. Tap Connect and pick a wallet.");
  return createWalletClient({ chain: aristotle, transport: custom(eth) });
}

/** Chain reads go to the public Arc RPC. The injected wallet answers signing, and on this page its eth_call does not return. */
export function publicClient() {
  return createPublicClient({
    chain: aristotle,
    transport: http(NETWORK.rpc, { timeout: 12_000, retryCount: 1 }),
  });
}

async function withArcFees<T extends Record<string, unknown>>(
  tx: T,
): Promise<T & { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  const pub = publicClient();
  const fees = await aristotleEip1559Fees({
    getGasPrice: () => pub.getGasPrice(),
    requestMaxPriorityFee: async () => {
      const raw = await pub.request({ method: "eth_maxPriorityFeePerGas" });
      return BigInt(raw as string);
    },
  });
  return { ...tx, ...fees };
}

export type SwapExecutionStep =
  | { step: "approve"; status: "pending" | "confirmed" | "skipped"; hash?: Hex }
  | { step: "swap"; status: "pending" | "confirmed" | "failed"; hash?: Hex; error?: string };

export type OftBridgeExecutionStep =
  | { step: "approve"; status: "pending" | "confirmed" | "skipped"; hash?: Hex }
  | { step: "send"; status: "pending" | "confirmed" | "failed"; hash?: Hex; error?: string };

/** JAINE / partner DEX paths are disabled. Swaps go through Zia only. */
export async function executeSparkDexSwap(_params: {
  approveTo: Address;
  approveData: Hex;
  swapTo: Address;
  swapData: Hex;
  chainId?: number;
  onStep?: (s: SwapExecutionStep) => void;
}): Promise<{ approveHash?: Hex; swapHash: Hex }> {
  throw new Error("Beacon refused this swap. Swap execution is off.");
}

/** Cross-chain OFT is P3. Honest refuse. */
export async function executeOftBridge(_params: {
  approveTo: Address;
  approveData: Hex;
  sendTo: Address;
  sendData: Hex;
  nativeFee: bigint;
  onStep?: (s: OftBridgeExecutionStep) => void;
}): Promise<{ approveHash?: Hex; sendHash: Hex }> {
  throw new Error("Cross-chain sends are not in this deploy.");
}

export function jobIdToBytes32(jobId: string): Hex {
  // Match backend e2e / settler: sha256(utf8 jobId) → bytes32
  return sha256(toBytes(jobId));
}

/** Parse "0.02" → USDC wei (18 decimals). */
export function parsePriceDisplay(priceDisplay: string): bigint {
  const cleaned = priceDisplay.replace(/[^0-9.]/g, "");
  const [whole = "0", frac = ""] = cleaned.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt((frac + "000000000000000000").slice(0, 18));
}

export async function getTokenMeta(): Promise<{ name: string; version: string }> {
  return { name: "Beacon", version: "1" };
}

export function openZeroGFaucet(): void {
  if (typeof window !== "undefined") {
    window.open(NETWORK.faucet, "_blank", "noopener,noreferrer");
  }
}

/** USDC only. No mock mint. */
export async function mintMockUsdt0(): Promise<Hex> {
  openZeroGFaucet();
  throw new Error(`Beacon uses USDC. Get USDC at ${NETWORK.faucet}. In-app mint is disabled.`);
}

export async function getNativeBalance(owner: Address): Promise<bigint> {
  const client = publicClient();
  return client.getBalance({ address: owner });
}

export type AuthorizationPayload = {
  payer: string;
  payee: string;
  amount: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  signature: string;
  jobHash: string;
  lockTxHash?: string;
  mode?: string;
};

/** Arc payments are signed USDC actions. This desk does not lock native value. */
export async function approveJobOnChain(_params: {
  jobId: string;
  priceDisplay: string;
}): Promise<AuthorizationPayload> {
  throw new Error("On Arc, the agent signs a USDC action. Beacon does not lock native value from this button.");
}

/** Refused. Beacon does not broadcast caller-supplied calldata. */
export async function executeAgentVaultPrep(_params: {
  to: Address;
  data: Hex;
  approveTo?: Address;
  approveData?: Hex;
  mode?: "eip3009" | "approve";
  token?: Address;
  amount?: string;
  action?: string;
}): Promise<{ approveHash?: Hex; txHash: Hex }> {
  throw new Error("Beacon does not send arbitrary calldata. Use the vault page for an owner transaction or a signed USDC action.");
}

export async function writeArcContract(params: {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}): Promise<Hex> {
  const txHash = await walletTimeout((async () => {
    await ensureArcNetwork();
    const wallet = walletClient();
    const [account] = await wallet.getAddresses();
    if (!account) throw new Error("Connect a wallet first.");
    return wallet.writeContract(
      await withArcFees({
        account,
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args ?? [],
        chain: aristotle,
      }),
    );
  })());
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("The transaction reverted on Arc. Beacon will not call this a success.");
  }
  return txHash;
}

export async function mintTestUsdt0(): Promise<Hex> {
  openZeroGFaucet();
  throw new Error(`Get USDC at ${NETWORK.faucet}`);
}

export const getUsdt0Balance = getNativeBalance;

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** personal_sign helper for Beacon Safe pay challenges. */
function walletTimeout<T>(task: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("The wallet did not answer. Open it, unlock it, and try again.")),
      20_000,
    );
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function signPersonalMessage(message: string): Promise<string> {
  return walletTimeout((async () => {
    await ensureArcNetwork();
    const wallet = walletClient();
    const [account] = await wallet.getAddresses();
    if (!account) throw new Error("Connect a wallet first.");
    return wallet.signMessage({ account, message });
  })());
}

/** Refused. The server does not choose calldata. */
export async function sendPreparedVaultTx(_params: {
  to: Address;
  data: Hex;
}): Promise<Hex> {
  throw new Error("Beacon does not submit server-built calldata. Owner calls are named vault functions.");
}
