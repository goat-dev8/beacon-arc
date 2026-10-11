import { useEffect, useState, type ReactNode } from "react";
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

const ACTION_HASH = /^0x[0-9a-fA-F]{64}$/;

export function VerifyPage() {
  const { jobId } = useParams();
  const [data, setData] = useState<ArcVerifyBody | null>(null);
  const [arcRpc, setArcRpc] = useState<ArcChainReceipt | null>(null);
  const [rpcErr, setRpcErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isHash = Boolean(jobId && ACTION_HASH.test(jobId));

  useEffect(() => {
    if (!jobId || !ACTION_HASH.test(jobId)) return;
    const base = apiBase();
    fetch(`${base}/v1/verify/${jobId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ArcVerifyBody>;
      })
      .then(setData)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "verify failed"));
    readArcReceipt(jobId)
      .then((row) => {
        setArcRpc(row);
        setRpcErr(null);
      })
      .catch((e: unknown) => setRpcErr(e instanceof Error ? e.message : "browser eth_call failed"));
  }, [jobId]);

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
    const rpcAgrees =
      arc && arcRpc?.exists
        ? ["vault", "agent", "recipient", "amount", "nonce"].every((key) => {
            const left = String(arc[key as keyof typeof arc] ?? "").toLowerCase();
            const right = String(arcRpc[key as keyof ArcChainReceipt] ?? "").toLowerCase();
            return left === right;
          })
        : null;
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
        <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: LINE, background: CARD }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FAINT }}>
            Independent RPC
          </p>
          <p className="mt-2 text-sm" style={{ color: rpcAgrees === false ? DANGER : MUTED }}>
            {rpcErr
              ? `Browser eth_call failed: ${rpcErr}.`
              : rpcAgrees
                ? "rpc.mainnet.arc.io returns the same vault, agent, recipient, amount, and nonce."
                : arcRpc?.exists
                  ? "The registry row is on chain. The API did not return the same fields."
                  : "No registry row for this action hash."}
          </p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">No receipt</h1>
      <p className="mt-3 text-sm" style={{ color: err ? DANGER : MUTED }}>
        {err ?? (arcRpc && !arcRpc.exists ? "The registry has no row for this action." : "Reading the registry…")}
      </p>
    </Shell>
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
