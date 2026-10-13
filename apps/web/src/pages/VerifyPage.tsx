import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { explorerAddress, explorerTx } from "@/lib/explorers";
import { apiBase } from "@/lib/publicEnv";
import { readArcReceipt, readRecordedEvent, type ArcChainReceipt, type RecordedEvent } from "@/lib/onchainReceipt";
import { CONTRACTS } from "@/lib/chain";

type ArcVerifyBody = {
  actionHash?: string;
  status?: string;
  vault?: string;
  agent?: string;
  recipient?: string;
  amount?: string;
  nonce?: string;
};

function isArcVerify(row: ArcVerifyBody | null): row is ArcVerifyBody & { vault: string; amount: string } {
  return Boolean(row?.vault && row.status === "recorded" && row.amount);
}

function usdcBase(raw?: string): string {
  if (!raw) return "—";
  try {
    const n = BigInt(raw);
    const whole = n / 1_000_000n;
    const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac} USDC` : `${whole} USDC`;
  } catch {
    return raw;
  }
}

function relativeTime(ms?: number): string {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

function utcStamp(ms?: number): string {
  if (!ms) return "";
  return `${new Date(ms).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

const BG = "#070908";
const FG = "#f4f6f4";
const MUTED = "#d7ddd8";
const FAINT = "#c5ccc7";
const LINE = "#2a312c";
const CARD = "#101412";
const ACCENT = "#39e08a";
const DANGER = "#ff6b6b";
const AMBER = "#f5b942";

const ACTION_HASH = /^0x[0-9a-fA-F]{64}$/;
const VERIFY_ATTEMPTS = 3;
const VERIFY_TIMEOUT_MS = 8000;

const CHECK_FIELDS = [
  { key: "vault", label: "Vault" },
  { key: "agent", label: "Agent" },
  { key: "recipient", label: "Recipient" },
  { key: "amount", label: "Amount" },
  { key: "nonce", label: "Nonce" },
] as const;

type CheckRow = {
  key: string;
  label: string;
  api?: string | null;
  rpc?: string | null;
  equal: boolean;
};

type CrossCheck =
  | { kind: "match"; rows: CheckRow[] }
  | { kind: "mismatch"; rows: CheckRow[] }
  | { kind: "api-unreachable" }
  | { kind: "rpc-unreachable" }
  | { kind: "no-row" }
  | { kind: "pending" };

function fieldEqual(key: string, a?: string | null, b?: string | null): boolean {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!x || !y) return false;
  if (key === "vault" || key === "agent" || key === "recipient") {
    return x.toLowerCase() === y.toLowerCase();
  }
  try {
    return BigInt(x) === BigInt(y);
  } catch {
    return x === y;
  }
}

/** API fetch with timeout and exponential backoff. Throws after VERIFY_ATTEMPTS attempts. */
async function fetchApiVerify(
  base: string,
  id: string,
  onAttempt: (n: number) => void,
): Promise<ArcVerifyBody> {
  let lastErr: unknown = new Error("verify failed");
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt += 1) {
    onAttempt(attempt);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
    try {
      const r = await fetch(`${base}/v1/verify/${id}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as ArcVerifyBody;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < VERIFY_ATTEMPTS) {
        await new Promise((res) => setTimeout(res, 400 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("verify failed");
}

export function VerifyPage() {
  const { jobId } = useParams();
  const [data, setData] = useState<ArcVerifyBody | null>(null);
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [apiAttempts, setApiAttempts] = useState(0);
  const [arcRpc, setArcRpc] = useState<ArcChainReceipt | null>(null);
  const [rpcErr, setRpcErr] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<RecordedEvent | null | undefined>(undefined);
  const runId = useRef(0);
  const isHash = Boolean(jobId && ACTION_HASH.test(jobId));

  const load = useCallback(() => {
    if (!jobId || !ACTION_HASH.test(jobId)) return;
    const id = ++runId.current;
    setApiStatus("loading");
    setApiErr(null);
    setApiAttempts(0);
    setRpcErr(null);
    setRecorded(undefined);
    void fetchApiVerify(apiBase(), jobId, setApiAttempts)
      .then((row) => {
        if (runId.current !== id) return;
        setData(row);
        setApiStatus("ok");
      })
      .catch((e: unknown) => {
        if (runId.current !== id) return;
        setApiErr(e instanceof Error ? e.message : "verify failed");
        setApiStatus("error");
      });
    void readArcReceipt(jobId)
      .then((row) => {
        if (runId.current !== id) return;
        setArcRpc(row);
        setRpcErr(null);
      })
      .catch((e: unknown) => {
        if (runId.current !== id) return;
        setRpcErr(e instanceof Error ? e.message : "browser eth_call failed");
      });
    void readRecordedEvent(jobId).then((row) => {
      if (runId.current !== id) return;
      setRecorded(row);
    });
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const arc = isArcVerify(data) ? data : null;
  if (!isHash) {
    return (
      <Shell>
        <InvalidHashNotice />
      </Shell>
    );
  }

  if (arc || arcRpc?.exists) {
    let cross: CrossCheck = { kind: "pending" };
    if (rpcErr) {
      cross = { kind: "rpc-unreachable" };
    } else if (arcRpc && !arcRpc.exists) {
      cross = { kind: "no-row" };
    } else if (arcRpc?.exists && apiStatus === "error") {
      cross = { kind: "api-unreachable" };
    } else if (arcRpc?.exists && apiStatus === "ok") {
      const rows: CheckRow[] = CHECK_FIELDS.map(({ key, label }) => {
        const api = arc ? String(arc[key] ?? "") : "";
        const rpc = String(arcRpc[key as keyof ArcChainReceipt] ?? "");
        return {
          key,
          label,
          api: api || undefined,
          rpc: rpc || undefined,
          equal: fieldEqual(key, api, rpc),
        };
      });
      cross = rows.every((r) => r.equal) ? { kind: "match", rows } : { kind: "mismatch", rows };
    }

    return (
      <Shell>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
          Receipt registry · chain 5042
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">USDC receipt</h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {usdcBase(arc?.amount ?? arcRpc?.amount)} recorded. Swap, privacy, post-quantum signing, and x402 are not in this receipt.
        </p>
        <Explainer />
        <section
          aria-label="Receipt details"
          className="mt-6 rounded-2xl border p-5"
          style={{ borderColor: LINE, background: CARD }}
        >
          <dl className="grid gap-4 text-sm">
            <HashRow label="Action" value={arc?.actionHash ?? arcRpc?.actionHash ?? jobId} />
            <HashRow label="Vault" value={arc?.vault ?? arcRpc?.vault} href={explorerAddress(arc?.vault ?? arcRpc?.vault ?? "")} />
            <HashRow label="Agent" value={arc?.agent ?? arcRpc?.agent} href={explorerAddress(arc?.agent ?? arcRpc?.agent ?? "")} />
            <HashRow label="Recipient" value={arc?.recipient ?? arcRpc?.recipient} href={explorerAddress(arc?.recipient ?? arcRpc?.recipient ?? "")} />
            <Meta label="Amount" value={`${usdcBase(arc?.amount ?? arcRpc?.amount)} · ${arc?.amount ?? arcRpc?.amount} base units`} />
            <Meta label="Nonce" value={arc?.nonce ?? arcRpc?.nonce} />
            {recorded && (
              <>
                <HashRow
                  label="Recording transaction"
                  value={recorded.txHash}
                  href={explorerTx(recorded.txHash)}
                  hint="The Arc transaction that wrote this receipt to the registry."
                />
                <Meta
                  label="Block"
                  value={
                    recorded.blockTime
                      ? `#${recorded.blockNumber} · ${relativeTime(recorded.blockTime)} (${utcStamp(recorded.blockTime)})`
                      : `#${recorded.blockNumber}`
                  }
                />
              </>
            )}
          </dl>
        </section>
        <CrossCheckPanel
          cross={cross}
          apiErr={apiErr}
          rpcErr={rpcErr}
          apiAttempts={apiAttempts}
          onRetry={load}
        />
        <p className="mt-6 text-center text-xs" style={{ color: FAINT }}>
          Registry contract{" "}
          <a
            className="underline underline-offset-2 hover:no-underline"
            style={{ color: ACCENT }}
            href={explorerAddress(CONTRACTS.receiptRegistry)}
            target="_blank"
            rel="noreferrer"
          >
            {CONTRACTS.receiptRegistry}
          </a>{" "}
          · verified source on Sourcify
        </p>
      </Shell>
    );
  }

  const loading = apiStatus === "loading" && !arcRpc;
  return (
    <Shell>
      {loading ? (
        <div role="status" aria-label="Loading receipt">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
            Receipt registry · chain 5042
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">USDC receipt</h1>
          <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: LINE, background: CARD }}>
            <div className="grid gap-4">
              {[92, 78, 84, 70, 45].map((w, i) => (
                <div key={i}>
                  <div className="h-2.5 rounded-full animate-pulse" style={{ width: "28%", background: LINE }} />
                  <div className="mt-2 h-4 rounded-md animate-pulse" style={{ width: `${w}%`, background: LINE }} />
                </div>
              ))}
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: FAINT }}>
              Reading the registry on Arc…
            </p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">No receipt</h1>
          <p className="mt-3 text-sm" style={{ color: apiStatus === "error" ? DANGER : MUTED }}>
            {apiStatus === "error"
              ? `Couldn't reach the API (${apiErr ?? "unknown error"}) and the registry has no row yet.`
              : "The registry has no row for this action."}
          </p>
          {apiStatus === "error" && <RetryButton onRetry={load} attempts={apiAttempts} />}
          <div className="mt-8">
            <LookupForm />
          </div>
        </>
      )}
    </Shell>
  );
}

/** Plain-language explainer for non-technical judges. Native <details> = keyboard accessible. */
function Explainer() {
  return (
    <details
      className="group mt-4 rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: LINE, background: "#0c100d" }}
    >
      <summary
        className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden"
        style={{ color: FG }}
      >
        <span aria-hidden="true" className="mr-2 inline-block transition-transform group-open:rotate-90" style={{ color: ACCENT }}>
          ▶
        </span>
        What am I looking at?
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: MUTED }}>
        <p>
          This page proves a <strong style={{ color: FG }}>real USDC payment happened on Arc</strong>. An AI
          agent signed a payment order, a smart-contract vault executed it — the vault physically cannot be
          tricked into paying anything else — and the payment was permanently recorded in the Beacon receipt
          registry on Arc mainnet.
        </p>
        <p>
          The panel below compares <strong style={{ color: FG }}>two independent sources</strong>: our server,
          and a direct read of the Arc blockchain from your own browser. Green means they agree on every
          field. If they disagreed, this page would say so in red. Nothing here is a simulation.
        </p>
      </div>
    </details>
  );
}

function InvalidHashNotice() {
  return (
    <>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
        That doesn&apos;t look like a receipt
      </h1>
      <p className="mt-3 text-sm" style={{ color: MUTED }}>
        A Beacon receipt is a 32-byte action hash: <code className="font-mono text-xs" style={{ color: FG }}>0x</code>{" "}
        followed by 64 hexadecimal characters. This page verifies receipts from the on-chain registry — it does
        not look up compute jobs, TEE attestations, or escrows.
      </p>
      <div className="mt-8">
        <LookupForm />
      </div>
      <p className="mt-6 text-sm" style={{ color: FAINT }}>
        Looking for a real one? The homepage lists live receipts recorded on Arc mainnet.{" "}
        <Link className="underline underline-offset-2" style={{ color: ACCENT }} to="/">
          Back to home
        </Link>
      </p>
    </>
  );
}

/** Paste-a-hash lookup. Keyboard accessible; announces format errors. */
function LookupForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!ACTION_HASH.test(v)) {
      setError("Enter 0x followed by 64 hex characters.");
      return;
    }
    setError(null);
    navigate(`/verify/${v}`);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border p-5" style={{ borderColor: LINE, background: CARD }}>
      <label htmlFor="verify-lookup" className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        Look up a receipt
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="verify-lookup"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="0x… 64 hex characters"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "verify-lookup-error" : undefined}
          className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-2.5 font-mono text-sm"
          style={{ borderColor: error ? DANGER : LINE, color: FG }}
        />
        <button
          type="submit"
          className="rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: ACCENT, color: "#06130c" }}
        >
          Verify
        </button>
      </div>
      {error && (
        <p id="verify-lookup-error" role="alert" className="mt-2 text-xs" style={{ color: DANGER }}>
          {error}
        </p>
      )}
    </form>
  );
}

function CrossCheckPanel({
  cross,
  apiErr,
  rpcErr,
  apiAttempts,
  onRetry,
}: {
  cross: CrossCheck;
  apiErr: string | null;
  rpcErr: string | null;
  apiAttempts: number;
  onRetry: () => void;
}) {
  const border =
    cross.kind === "match" ? ACCENT : cross.kind === "mismatch" ? DANGER : LINE;
  const accentBar =
    cross.kind === "match" ? ACCENT : cross.kind === "mismatch" ? DANGER : cross.kind === "pending" ? FAINT : AMBER;
  return (
    <section
      role="status"
      aria-label={`Cross-check: ${cross.kind.replace("-", " ")}`}
      className="relative mt-6 overflow-hidden rounded-2xl border p-5 pl-6"
      style={{
        borderColor: border,
        background: CARD,
        boxShadow: cross.kind === "match" ? "0 0 32px rgba(57,224,138,0.12)" : undefined,
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: accentBar }} />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        Independent RPC · cross-check
      </p>
      {cross.kind === "match" && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-base font-bold" style={{ color: ACCENT }}>
              <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: ACCENT, color: "#06130c" }}>
                ✓
              </span>
              Independent RPC agrees with the API.
            </p>
            <span
              className="rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: "rgba(57,224,138,0.14)", color: ACCENT, border: `1px solid ${ACCENT}` }}
            >
              Independently verified
            </span>
          </div>
          <p className="mt-2 text-xs" style={{ color: MUTED }}>
            rpc.mainnet.arc.io returns the same five fields the API reported. Two independent sources, one
            receipt — checked live, just now, in your browser.
          </p>
          <dl className="mt-4 grid gap-2">
            {cross.rows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: LINE }}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: FAINT }}>
                  {row.label}
                </dt>
                <dd className="break-all font-mono text-xs" style={{ color: FG }}>
                  {row.key === "amount" ? `${usdcBase(row.rpc ?? undefined)} · ${row.rpc}` : row.rpc}
                  <span className="ml-2" style={{ color: ACCENT }} aria-label="match">
                    ✓
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {cross.kind === "mismatch" && (
        <>
          <p className="mt-2 flex items-center gap-2 text-base font-bold" style={{ color: DANGER }}>
            <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: DANGER, color: "#1a0606" }}>
              ✕
            </span>
            Independent RPC disagrees with the API.
          </p>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            The chain is authoritative. The differing fields are highlighted below.
          </p>
          <dl className="mt-4 grid gap-2">
            {cross.rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-1 rounded-lg border-b px-3 pb-2 pt-1"
                style={{
                  borderColor: row.equal ? LINE : DANGER,
                  background: row.equal ? "transparent" : "rgba(255,107,107,0.06)",
                }}
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: FAINT }}>
                  {row.label}{" "}
                  <span style={{ color: row.equal ? ACCENT : DANGER }}>{row.equal ? "✓ match" : "✗ differs"}</span>
                </dt>
                <dd className="break-all font-mono text-xs" style={{ color: FG }}>
                  <span style={{ color: FAINT }}>api&nbsp;</span>{row.api ?? "—"}
                </dd>
                <dd className="break-all font-mono text-xs" style={{ color: FG }}>
                  <span style={{ color: FAINT }}>rpc&nbsp;</span>{row.rpc ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {cross.kind === "api-unreachable" && (
        <>
          <p className="mt-2 flex items-center gap-2 text-base font-bold" style={{ color: AMBER }}>
            <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: AMBER, color: "#1a1206" }}>
              !
            </span>
            Couldn&apos;t reach the API.
          </p>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            The API did not answer ({apiErr ?? "unknown error"}) after {apiAttempts}{" "}
            {apiAttempts === 1 ? "attempt" : "attempts"}. This is a network problem, not a proof
            problem — the registry row above comes straight from Arc. Retries use backoff.
          </p>
          <RetryButton onRetry={onRetry} attempts={apiAttempts} />
        </>
      )}
      {cross.kind === "rpc-unreachable" && (
        <>
          <p className="mt-2 flex items-center gap-2 text-base font-bold" style={{ color: AMBER }}>
            <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: AMBER, color: "#1a1206" }}>
              !
            </span>
            Couldn&apos;t reach Arc RPC.
          </p>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            Browser eth_call failed: {rpcErr ?? "unknown error"}. The API data above is still shown,
            but it is not independently confirmed.
          </p>
          <RetryButton onRetry={onRetry} attempts={apiAttempts} />
        </>
      )}
      {cross.kind === "no-row" && (
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          No registry row for this action hash on chain.
        </p>
      )}
      {cross.kind === "pending" && (
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Comparing the API against an independent Arc RPC read…
        </p>
      )}
    </section>
  );
}

function RetryButton({ onRetry, attempts }: { onRetry: () => void; attempts: number }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 rounded-full px-4 py-2 text-sm font-semibold"
      style={{ background: ACCENT, color: "#06130c" }}
    >
      Retry check{attempts > 0 ? ` (tried ${attempts}×)` : ""}
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh antialiased" style={{ background: BG, color: FG }}>
      <header className="border-b px-5 py-4" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Verified on Arc
          </p>
          <Link className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: ACCENT, color: "#06130c" }} to="/">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-b pb-3" style={{ borderColor: LINE }}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        {label}
      </dt>
      <dd className="mt-1 break-all text-base font-medium">{value}</dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className="ml-2 inline-flex shrink-0 items-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors hover:bg-white/5"
      style={{ borderColor: LINE, color: copied ? ACCENT : FAINT }}
    >
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </button>
  );
}

function HashRow({ label, value, href, hint }: { label: string; value?: string | null; href?: string; hint?: string }) {
  if (!value) return null;
  return (
    <div className="border-b pb-3" style={{ borderColor: LINE }}>
      <dt className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        <span>{label}</span>
        <CopyButton value={value} label={label} />
      </dt>
      {href ? (
        <dd className="mt-1 break-all">
          <a
            className="text-sm hover:underline"
            style={{ color: ACCENT }}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${label} ${value} — opens in the Arc explorer`}
          >
            {value}
            <span aria-hidden="true" className="ml-1" style={{ color: FAINT }}>↗</span>
          </a>
        </dd>
      ) : (
        <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
      )}
      {hint && (
        <dd className="mt-1 text-xs" style={{ color: FAINT }}>
          {hint}
        </dd>
      )}
    </div>
  );
}
