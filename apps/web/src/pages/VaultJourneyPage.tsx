import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseUnits, type Address, type Hex } from "viem";
import { useChainId } from "wagmi";
import { CONTRACTS, NETWORK } from "@/lib/chain";
import {
  createApiGrant,
  executeSignedSend,
  fetchArcVault,
  fetchSwapQuote,
  prepareSend,
  requestSessionChallenge,
  revokeApiGrant,
  verifySession,
} from "@/lib/arcApi";
import { useProductWallet } from "@/lib/productWallet";
import { ensureArcNetwork, publicClient, shortAddress, signPersonalMessage, walletClient, writeArcContract } from "@/lib/wallet";

const factoryAbi = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "executor", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

const usdcAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const vaultAbi = [
  {
    type: "function",
    name: "setPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "maxPerTx_", type: "uint256" },
      { name: "windowLimit_", type: "uint256" },
      { name: "windowSeconds_", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allowRecipient",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "blockRecipient",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "blocked", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeGrant",
    stateMutability: "nonpayable",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [],
  },
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
  {
    type: "function",
    name: "setGrant",
    stateMutability: "nonpayable",
    inputs: [
      { name: "grantId", type: "uint256" },
      { name: "agent", type: "address" },
      { name: "grantMax", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "scopes", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "windowSeconds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [{ name: "paused_", type: "bool" }],
    outputs: [],
  },
] as const;

const executedEvent = {
  type: "event",
  name: "Executed",
  inputs: [
    { name: "actionHash", type: "bytes32", indexed: false },
    { name: "agent", type: "address", indexed: false },
    { name: "recipient", type: "address", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
    { name: "nonce", type: "uint256", indexed: false },
  ],
} as const;

function usdcBase(text: string): bigint {
  const parsed = tryUsdcBase(text);
  if (parsed === null) throw new Error("Enter a USDC amount with at most 6 decimals.");
  return parsed;
}

function tryUsdcBase(text: string): bigint | null {
  const cleaned = text.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;
  return parseUnits(cleaned, 6);
}

function isHexAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-[var(--p-muted)]">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em]">{label}</span>
      {children}
    </label>
  );
}

const actionClass =
  "inline-flex min-h-11 max-w-full items-center justify-center rounded-full bg-[var(--p-accent)] px-4 py-2.5 text-center text-sm font-semibold leading-snug text-[#062116] disabled:cursor-not-allowed disabled:bg-[#3a4149] disabled:text-[#f7f8f8] disabled:opacity-100 disabled:ring-1 disabled:ring-[#d5dde3]";

const inputClass =
  "mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm text-[var(--p-fg)] transition-colors focus:border-[var(--p-accent)] focus:outline-none";

type StepState = "done" | "current" | "locked" | "live";

const STEPS = [
  { n: 1, title: "Create", hint: "One vault per owner" },
  { n: 2, title: "Fund", hint: "ERC-20 USDC in" },
  { n: 3, title: "Session", hint: "12-hour browser login" },
  { n: 4, title: "Policy", hint: "Caps and window" },
  { n: 5, title: "Agent", hint: "Allowlist + grant" },
  { n: 6, title: "Bearer", hint: "API credential" },
  { n: 7, title: "Send", hint: "Sign and relay" },
  { n: 8, title: "Activity", hint: "On-chain receipts" },
] as const;

function StepRail({ states }: { states: StepState[] }) {
  return (
    <nav aria-label="Vault setup progress" className="mt-6 overflow-x-auto pb-1">
      <ol className="flex min-w-[640px] items-stretch gap-1.5">
        {STEPS.map((s, i) => {
          const st = states[i];
          return (
            <li key={s.n} className="flex-1">
              <a
                href={`#step-${s.n}`}
                aria-current={st === "current" ? "step" : undefined}
                className={`flex h-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  st === "done"
                    ? "border-[var(--p-accent)]/30 bg-[var(--p-accent-soft)]"
                    : st === "current"
                      ? "border-[var(--p-accent)] bg-[var(--p-card)] ring-1 ring-[var(--p-accent)]"
                      : st === "live"
                        ? "border-[var(--p-border)] bg-[var(--p-card)]"
                        : "border-[var(--p-border)] bg-[var(--p-card)] opacity-55"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      st === "done"
                        ? "bg-[var(--p-accent)] text-[#062116]"
                        : st === "current"
                          ? "bg-[var(--p-accent)] text-[#062116]"
                          : st === "live"
                            ? "bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]"
                            : "bg-[var(--p-border)] text-[var(--p-muted)]"
                    }`}
                  >
                    {st === "done" ? "✓" : st === "locked" ? "·" : s.n}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-fg)]">
                    {s.title}
                  </span>
                </span>
                <span className="font-mono text-[10px] leading-tight text-[var(--p-muted)]">{s.hint}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeader({ n, title, state }: { n: number; title: string; state: StepState }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
          state === "done"
            ? "bg-[var(--p-accent)] text-[#062116]"
            : state === "current"
              ? "bg-[var(--p-accent)] text-[#062116]"
              : "bg-[var(--p-border)] text-[var(--p-muted)]"
        }`}
      >
        {state === "done" ? "✓" : String(n).padStart(2, "0")}
      </span>
      <h2 className="font-display text-xl">{title}</h2>
      <span
        className={`ml-auto rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
          state === "done"
            ? "bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]"
            : state === "current"
              ? "bg-[var(--p-accent)] text-[#062116]"
              : state === "live"
                ? "bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]"
                : "bg-[var(--p-border)] text-[var(--p-muted)]"
        }`}
      >
        {state === "done" ? "Done" : state === "current" ? "Now" : state === "live" ? "Live" : "Locked"}
      </span>
    </div>
  );
}

export function VaultJourneyPage() {
  const { wallet, connect, connecting } = useProductWallet();
  const chainId = useChainId();
  const qc = useQueryClient();
  const [note, setNote] = useState("This signature and these buttons move funds only when Arc confirms a transaction.");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [bearer, setBearer] = useState<string | null>(null);
  const [fund, setFund] = useState("0.01");
  const [max, setMax] = useState("0.01");
  const [windowCap, setWindowCap] = useState("0.05");
  const [recipient, setRecipient] = useState("");
  const [agent, setAgent] = useState("");
  const [grantId, setGrantId] = useState("1");
  const [sendAmount, setSendAmount] = useState("0.01");
  const [proof, setProof] = useState<{ txHash: string; actionHash: string } | null>(null);

  const vaultQuery = useQuery({
    queryKey: ["arc-vault", wallet],
    queryFn: () => fetchArcVault(wallet!),
    enabled: Boolean(wallet),
    retry: false,
  });
  const quoteQuery = useQuery({
    queryKey: ["arc-swap-quote"],
    queryFn: () => fetchSwapQuote("10000"),
  });
  const vault = vaultQuery.data;
  const vaultPending = Boolean(wallet) && vaultQuery.isPending;
  const grantQuery = useQuery({
    queryKey: ["arc-grant", vault?.vault, grantId],
    enabled: Boolean(vault?.vault) && /^\d+$/.test(grantId),
    queryFn: async () => {
      const row = await publicClient().readContract({
        address: vault!.vault as Address,
        abi: vaultAbi,
        functionName: "grants",
        args: [BigInt(grantId)],
      });
      return {
        agent: row[0],
        maxPerTx: row[1].toString(),
        expiry: Number(row[2]),
        scopes: Number(row[3]),
        active: row[4],
      };
    },
  });
  const windowQuery = useQuery({
    queryKey: ["arc-window", vault?.vault],
    enabled: Boolean(vault?.vault),
    queryFn: async () =>
      publicClient().readContract({
        address: vault!.vault as Address,
        abi: vaultAbi,
        functionName: "windowSeconds",
      }),
  });
  const registeredAgent = grantQuery.data?.agent;
  const nextMax = tryUsdcBase(max);
  const nextWindow = tryUsdcBase(windowCap);
  const policyUnchanged = Boolean(
    vault &&
      nextMax !== null &&
      nextWindow !== null &&
      nextMax === BigInt(vault.maxPerTx) &&
      nextWindow === BigInt(vault.windowLimit) &&
      windowQuery.data === 86400n,
  );
  const grantReady = Boolean(registeredAgent && registeredAgent !== "0x0000000000000000000000000000000000000000" && grantQuery.data?.active);
  const walletIsAgent = Boolean(wallet && grantReady && wallet.toLowerCase() === registeredAgent!.toLowerCase());
  const stepDone: boolean[] = [
    Boolean(vault),
    Boolean(vault && BigInt(vault.usdcBalance) > 0n),
    Boolean(session),
    Boolean(vault && vault.policyVersion !== "0"),
    grantReady,
    Boolean(bearer),
    Boolean(proof),
  ];
  const currentIdx = stepDone.findIndex((d) => !d);
  const stepStates: StepState[] = STEPS.map((_, i) => {
    if (i === 7) return "live";
    if (stepDone[i]) return "done";
    if (!wallet || i === currentIdx) return "current";
    return "locked";
  });
  const activityQuery = useQuery({
    queryKey: ["arc-activity", vault?.vault],
    enabled: Boolean(vault?.vault),
    queryFn: async () => {
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
            address: vault!.vault as Address,
            event: executedEvent,
            fromBlock: from,
            toBlock: to,
          }),
        ),
      );
      const logs = parts.flat();
      return logs.slice(-8).reverse().map((log) => ({
        actionHash: log.args.actionHash ?? "",
        agent: log.args.agent ?? "",
        recipient: log.args.recipient ?? "",
        amount: log.args.amount?.toString() ?? "",
        nonce: log.args.nonce?.toString() ?? "",
        txHash: log.transactionHash,
      }));
    },
  });
  const wrongChain = Boolean(wallet) && chainId !== NETWORK.chainId;

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["arc-vault", wallet] });
    await qc.invalidateQueries({ queryKey: ["arc-grant"] });
    await qc.invalidateQueries({ queryKey: ["arc-window"] });
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--p-bg)] px-4 py-6 text-[var(--p-fg)] md:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">Arc · chain {NETWORK.chainId}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your USDC vault</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--p-muted)]">
        One vault per owner. You set the policy. An agent signs the exact send. The executor only relays that signature.
        Eight steps, in order — each one unlocks the next.
      </p>

      <StepRail states={stepStates} />

      {wrongChain && (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm">
          This wallet is on chain {chainId}. Beacon only moves USDC on Arc 5042.
          <button className="ml-3 underline" type="button" onClick={() => void ensureArcNetwork()}>
            Switch to Arc
          </button>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        {!wallet ? (
          <button className="rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm text-white" type="button" disabled={connecting} onClick={() => void connect()}>
            Connect wallet
          </button>
        ) : (
          <p className="text-sm">Connected {shortAddress(wallet)}. {vault ? vault.summary : vaultQuery.isError ? "No vault for this wallet yet." : "Reading the vault…"}</p>
        )}
        {vault && (
          <p className="mt-2 font-mono text-xs text-[var(--p-muted)]">
            Vault {shortAddress(vault.vault)} · policy v{vault.policyVersion} · nonce {vault.nonce} · max {vault.maxPerTx} base units
            {vault.paused ? " · paused" : ""}
          </p>
        )}
        <p className="mt-3 text-sm text-[var(--p-muted)]">{note}</p>
        {quoteQuery.data && (
          <p className="mt-3 text-sm text-[var(--p-muted)]">
            Uniswap V2 read: 0.01 USDC quotes {quoteQuery.data.amountOut} EURC base units.
            {" "}{quoteQuery.data.reason}
          </p>
        )}
      </section>

      <div className="mt-4 grid scroll-mt-24 gap-4 lg:grid-cols-2">
        <section id="step-1" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={1} title="Create" state={stepStates[0]} />
          <p className="mt-1 text-sm text-[var(--p-muted)]">
            {vault
              ? `This owner already has vault ${vault.vault}. Another create reverts.`
              : "The factory allows one vault for this owner. A second create reverts."}
          </p>
          <button
            className={`${actionClass} mt-3`}
            type="button"
            disabled={!wallet || busy || wrongChain || Boolean(vault) || vaultPending}
            onClick={() => run(async () => {
              try {
                const existing = await fetchArcVault(wallet!);
                setNote(`Vault ${existing.vault} is already registered for this owner. Cancel the wallet if Create is still open. That call reverts.`);
                await refresh();
                return;
              } catch {
                /* This owner has no factory vault yet. */
              }
              const hash = await writeArcContract({
                address: CONTRACTS.vaultFactory,
                abi: factoryAbi,
                functionName: "create",
                args: [wallet as Address, CONTRACTS.executor],
              });
              setNote(`Vault created. Arc tx ${hash}`);
              await refresh();
            })}
          >
            {vault ? "Vault already exists" : vaultPending ? "Checking the factory…" : "Create my vault"}
          </button>
        </section>

        <section id="step-2" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={2} title="Fund" state={stepStates[1]} />
          <p className="mt-1 text-sm text-[var(--p-muted)]">This is an ERC-20 USDC transfer into the vault. It is the same pool as native USDC. Beacon does not add the two balances.</p>
          <Field label="Amount USDC">
            <input className={inputClass} value={fund} onChange={(e) => setFund(e.target.value)} />
          </Field>
          <button
            className={`${actionClass} mt-3`}
            type="button"
            disabled={!vault || busy || wrongChain}
            onClick={() => run(async () => {
              const hash = await writeArcContract({
                address: CONTRACTS.usdc,
                abi: usdcAbi,
                functionName: "transfer",
                args: [vault!.vault as Address, usdcBase(fund)],
              });
              setNote(`Deposit submitted. Arc tx ${hash}`);
              await refresh();
            })}
          >
            Transfer USDC to the vault
          </button>
        </section>

        <section id="step-3" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={3} title="Browser session" state={stepStates[2]} />
          <p className="mt-1 text-sm text-[var(--p-muted)]">This signature does not move funds. It authorizes this browser for 12 hours. It does not reveal a key. The login challenge expires in 10 minutes.</p>
          <button
            className={`${actionClass} mt-3`}
            type="button"
            disabled={!wallet || busy}
            onClick={() => run(async () => {
              const challenge = await requestSessionChallenge(wallet!);
              const signature = await signPersonalMessage(challenge.message);
              const verified = await verifySession(wallet!, signature);
              setSession(verified.token);
              setNote("Session unlocked. The signature was a login, not a transfer.");
            })}
          >
            {session ? "Session unlocked" : "Unlock this browser"}
          </button>
        </section>

        <section id="step-4" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={4} title="Policy" state={stepStates[3]} />
          <div className="mt-3 grid gap-3">
            <Field label="Max per send, USDC"><input className={inputClass} value={max} onChange={(e) => setMax(e.target.value)} /></Field>
            <Field label="Window cap, USDC"><input className={inputClass} value={windowCap} onChange={(e) => setWindowCap(e.target.value)} /></Field>
          </div>
          <p className="mt-3 text-sm text-[var(--p-muted)]">
            {policyUnchanged
              ? "These numbers already match the vault. Saving would still raise the policy version and make older signatures fail, so the button stays off."
              : "Saving raises the policy version. Actions signed for the old version no longer match."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain || windowQuery.isPending || policyUnchanged || nextMax === null || nextWindow === null}
            onClick={() => run(async () => {
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "setPolicy",
                args: [usdcBase(max), usdcBase(windowCap), 86400n],
              });
              setNote(`Policy updated. Arc tx ${hash}. Old signed actions no longer match this version.`);
              await refresh();
            })}
          >
            {windowQuery.isPending ? "Reading policy…" : policyUnchanged ? "Policy already matches" : "Set policy on Arc"}
          </button>
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain}
            onClick={() => run(async () => {
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "setPaused",
                args: [!vault!.paused],
              });
              setNote(vault!.paused ? `Resumed. Arc tx ${hash}` : `Paused. Arc tx ${hash}`);
              await refresh();
            })}
          >
            {vault?.paused ? "Resume" : "Pause"}
          </button>
          </div>
        </section>

        <section id="step-5" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={5} title="Recipient and agent" state={stepStates[4]} />
          {grantQuery.data && (
            <p className="mt-2 text-sm text-[var(--p-muted)]">
              {grantReady
                ? `Grant ${grantId} is active for ${registeredAgent}. Max ${grantQuery.data.maxPerTx} base units. Expires ${new Date(grantQuery.data.expiry * 1000).toISOString()}. Scope ${grantQuery.data.scopes}.`
                : `Grant ${grantId} has no active agent.`}
              {wallet && grantReady && !walletIsAgent ? " This wallet is not that agent, so it cannot sign a send." : ""}
              {" "}Registering needs an agent address in the field. An empty field does not use this wallet, and it does not replace the current grant.
            </p>
          )}
          <div className="mt-3 grid gap-3">
            <Field label="Allow this recipient">
              <input className={inputClass} value={recipient} placeholder="0x…" onChange={(e) => setRecipient(e.target.value)} />
            </Field>
            <Field label="Agent address">
              <input className={inputClass} value={agent} placeholder={wallet ?? "0x…"} onChange={(e) => setAgent(e.target.value)} />
            </Field>
            <Field label="Grant id"><input className={inputClass} value={grantId} onChange={(e) => setGrantId(e.target.value)} /></Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain || !isHexAddress(recipient)}
            onClick={() => run(async () => {
              if (!isHexAddress(recipient)) throw new Error("Enter the recipient address before allowing it.");
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "allowRecipient",
                args: [recipient, true],
              });
              setNote(`Recipient allowed. Arc tx ${hash}`);
            })}
          >
            Allow recipient
          </button>
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain || !isHexAddress(recipient)}
            onClick={() => run(async () => {
              if (!isHexAddress(recipient)) throw new Error("Enter the recipient address before blocking it.");
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "blockRecipient",
                args: [recipient, true],
              });
              setNote(`Recipient blocked. Arc tx ${hash}. A later send to this address reverts.`);
            })}
          >
            Block recipient
          </button>
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain || !isHexAddress(agent)}
            onClick={() => run(async () => {
              if (!isHexAddress(agent)) throw new Error("Enter the agent address. An empty field does not register this wallet.");
              const who = agent;
              const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "setGrant",
                args: [BigInt(grantId), who, usdcBase(max), expiry, 1],
              });
              setNote(`On-chain grant set for ${shortAddress(who)}. Arc tx ${hash}. Scope is send only.`);
            })}
          >
            Register agent on chain
          </button>
          <button
            className={actionClass}
            type="button"
            disabled={!vault || busy || wrongChain}
            onClick={() => run(async () => {
              const hash = await writeArcContract({
                address: vault!.vault as Address,
                abi: vaultAbi,
                functionName: "revokeGrant",
                args: [BigInt(grantId)],
              });
              setNote(`On-chain grant ${grantId} revoked. Arc tx ${hash}.`);
              await refresh();
            })}
          >
            Revoke on-chain grant
          </button>
          </div>
        </section>

        <section id="step-6" className="scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
          <StepHeader n={6} title="MCP bearer" state={stepStates[5]} />
          <p className="mt-1 text-sm text-[var(--p-muted)]">The bearer authenticates the API. It cannot change the signed action. Shown once.</p>
          <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={actionClass}
            type="button"
            disabled={!session || busy}
            onClick={() => run(async () => {
              const who = agent || wallet!;
              const created = await createApiGrant(session!, who, usdcBase(max).toString());
              setBearer(created.bearer);
              setNote("Bearer created. Copy it now. Revoke it here if it leaks.");
            })}
          >
            Create API bearer
          </button>
          <button
            className={actionClass}
            type="button"
            disabled={!session || !bearer || busy}
            onClick={() => run(async () => {
              await revokeApiGrant(session!, bearer!);
              setBearer(null);
              setNote("API bearer revoked. The same bearer now gets 401.");
            })}
          >
            Revoke bearer
          </button>
          </div>
          {bearer && <p className="mt-3 break-all font-mono text-xs">{bearer}</p>}
        </section>
      </div>

      <section id="step-7" className="mt-4 scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <StepHeader n={7} title="Send" state={stepStates[6]} />
        <p className="mt-1 text-sm text-[var(--p-muted)]">
          Beacon prepares the exact action. Only the registered agent wallet can sign it. A changed amount, recipient, or deadline will not match the signature, and Arc will not be told it succeeded.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Send amount, USDC"><input className={inputClass} value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} /></Field>
          <Field label="Recipient"><input className={inputClass} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
        </div>
        {recipient && !isHexAddress(recipient) && (
          <p className="mt-2 font-mono text-[11px] text-[var(--p-warn)]">
            Enter a valid 0x recipient address to enable signing.
          </p>
        )}
        <button
          className={`${actionClass} mt-3`}
          type="button"
          disabled={!session || !vault || busy || wrongChain || !isHexAddress(recipient) || (grantReady && !walletIsAgent)}
          onClick={() => run(async () => {
            const who = (agent || wallet) as Address;
            if (who.toLowerCase() !== wallet!.toLowerCase()) {
              throw new Error("Switch to the agent wallet to sign. This browser will not sign for a different agent.");
            }
            const prepared = await prepareSend(session!, {
              grantId,
              agent: who,
              recipient,
              amount: usdcBase(sendAmount).toString(),
              deadline: String(Math.floor(Date.now() / 1000) + 10 * 60),
            });
            const walletApi = walletClient();
            const signature = await walletApi.signTypedData({
              account: who,
              domain: prepared.typedData.domain,
              types: prepared.typedData.types,
              primaryType: "Action",
              message: Object.fromEntries(
                Object.entries(prepared.typedData.message).map(([key, value]) => [
                  key,
                  typeof value === "string" && /^\d+$/.test(value) ? BigInt(value) : value,
                ]),
              ) as never,
            });
            const result = await executeSignedSend(session!, {
              ...prepared.typedData.message,
              vault: vault!.vault,
              owner: wallet!,
            } as Record<string, string>, signature as Hex);
            if (!result.txHash) throw new Error("No transaction hash. Beacon will not show success.");
            setProof({ txHash: result.txHash, actionHash: result.actionHash });
            setNote(`${prepared.summary}. Arc tx ${result.txHash}`);
            await refresh();
          })}
        >
          Sign and relay the send
        </button>
        {proof && (
          <p className="mt-3 text-sm">
            <a className="underline" href={`https://explorer.arc.io/tx/${proof.txHash}`} target="_blank" rel="noreferrer">Explorer transaction</a>
            {" · "}
            <a className="underline" href={`/verify/${proof.actionHash}`}>Public receipt</a>
          </p>
        )}
      </section>

      <section id="step-8" className="mt-4 scroll-mt-24 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <StepHeader n={8} title="Activity" state={stepStates[7]} />
        <p className="mt-1 text-sm text-[var(--p-muted)]">These rows are Executed logs from the vault’s first blocks and the latest window. A missing log is not shown as a success.</p>
        {activityQuery.isError && (
          <p className="mt-3 text-sm text-red-300">{activityQuery.error instanceof Error ? activityQuery.error.message : "Could not read vault logs."}</p>
        )}
        {activityQuery.data?.length === 0 && <p className="mt-3 text-sm text-[var(--p-muted)]">No Executed logs in the recent block window.</p>}
        <ul className="mt-3 space-y-3">
          {activityQuery.data?.map((row) => (
            <li key={`${row.txHash}-${row.nonce}`} className="text-sm">
              <span className="font-mono text-xs">{row.amount} base units · action nonce {row.nonce}</span>
              <span className="mt-1 block">
                <a className="underline" href={`/verify/${row.actionHash}`}>Receipt</a>
                {" · "}
                <a className="underline" href={`https://explorer.arc.io/tx/${row.txHash}`} target="_blank" rel="noreferrer">Transaction</a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
