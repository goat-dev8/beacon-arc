import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { explorerAddress } from "@/lib/explorers";
import { apiBase } from "@/lib/publicEnv";
import { readArcReceipt, type ArcChainReceipt } from "@/lib/onchainReceipt";

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
  const runId = useRef(0);
  const isHash = Boolean(jobId && ACTION_HASH.test(jobId));

  const load = useCallback(() => {
    if (!jobId || !ACTION_HASH.test(jobId)) return;
    const id = ++runId.current;
    setApiStatus("loading");
    setApiErr(null);
    setApiAttempts(0);
    setRpcErr(null);
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
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const arc = isArcVerify(data) ? data : null;
  if (!isHash) {
    return (
      <Shell>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Not an Arc receipt</h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Beacon verifies a 32-byte action hash from the receipt registry. This page does not look up a compute job, a TEE, or an escrow.
        </p>
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
        <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: LINE, background: CARD }}>
          <dl className="grid gap-4 text-sm">
            <HashRow label="Action" value={arc?.actionHash ?? arcRpc?.actionHash ?? jobId} />
            <HashRow label="Vault" value={arc?.vault ?? arcRpc?.vault} href={explorerAddress(arc?.vault ?? arcRpc?.vault ?? "")} />
            <HashRow label="Agent" value={arc?.agent ?? arcRpc?.agent} href={explorerAddress(arc?.agent ?? arcRpc?.agent ?? "")} />
            <HashRow label="Recipient" value={arc?.recipient ?? arcRpc?.recipient} href={explorerAddress(arc?.recipient ?? arcRpc?.recipient ?? "")} />
            <Meta label="Amount" value={`${usdcBase(arc?.amount ?? arcRpc?.amount)} · ${arc?.amount ?? arcRpc?.amount} base units`} />
            <Meta label="Nonce" value={arc?.nonce ?? arcRpc?.nonce} />
          </dl>
        </section>
        <CrossCheckPanel
          cross={cross}
          apiErr={apiErr}
          rpcErr={rpcErr}
          apiAttempts={apiAttempts}
          onRetry={load}
        />
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
        </>
      )}
    </Shell>
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
      style={{ borderColor: border, background: CARD }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: accentBar }} />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        Independent RPC · cross-check
      </p>
      {cross.kind === "match" && (
        <>
          <p className="mt-2 flex items-center gap-2 text-base font-bold" style={{ color: ACCENT }}>
            <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: ACCENT, color: "#06130c" }}>
              ✓
            </span>
            Independent RPC agrees with the API.
          </p>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            rpc.mainnet.arc.io returns the same five fields the API reported. Two independent sources, one receipt.
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
            The chain is authoritative. The differing fields are listed below.
          </p>
          <dl className="mt-4 grid gap-2">
            {cross.rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-1 border-b pb-2"
                style={{ borderColor: row.equal ? LINE : DANGER }}
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: FAINT }}>
                  {row.label}{" "}
                  <span style={{ color: row.equal ? ACCENT : DANGER }}>{row.equal ? "✓" : "✗"}</span>
                </dt>
                <dd className="break-all font-mono text-xs" style={{ color: FG }}>
                  api: {row.api ?? "—"}
                </dd>
                <dd className="break-all font-mono text-xs" style={{ color: FG }}>
                  rpc: {row.rpc ?? "—"}
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
            Couldn't reach the API.
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
            Couldn't reach Arc RPC.
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

function HashRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="border-b pb-3" style={{ borderColor: LINE }}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
        {label}
      </dt>
      {href ? (
        <dd className="mt-1 break-all">
          <a className="text-sm hover:underline" style={{ color: ACCENT }} href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        </dd>
      ) : (
        <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
      )}
    </div>
  );
}
