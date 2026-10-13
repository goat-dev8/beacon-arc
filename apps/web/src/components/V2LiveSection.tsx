import { useEffect, useRef, useState } from "react";
import {
  V2_BRIDGE_STATUS,
  V2_DEPLOYMENTS,
  V2_EXPLORER_TX,
  V2_SEND_PROOF,
  V2_SOURCIFY,
  V2_SWAP_PROOF,
} from "@/lib/v2Proofs";

function truncate(value: string) {
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
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
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copy ${label}`}
      className="inline-flex h-7 shrink-0 items-center px-2 font-mono text-[11px] text-[var(--p-muted)] underline decoration-dotted underline-offset-4 transition-colors hover:text-[var(--p-fg)]"
    >
      {copied ? "Copied ✓" : "Copy"}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </button>
  );
}

function ProofLabels({ labels }: { labels: readonly string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <span
          key={l}
          className="rounded-full bg-[var(--p-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--p-accent-text)]"
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function TxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="mt-2 flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate font-mono text-[11px] text-[var(--p-muted)]" title={hash}>
        {truncate(hash)}
      </code>
      <CopyButton value={hash} label={label} />
      <a
        className="shrink-0 font-mono text-[11px] text-[var(--p-accent-text)] underline decoration-dotted underline-offset-4 hover:underline"
        href={V2_EXPLORER_TX(hash)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label} ${hash} — opens in the Arc explorer`}
      >
        Explorer ↗
      </a>
    </div>
  );
}

export function V2LiveSection() {
  return (
    <section
      className="mt-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5"
      aria-label="V2 live execution proofs"
    >
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl">V2 · Live execution</h2>
        <span className="ml-auto rounded-full bg-[var(--p-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-accent-text)]">
          Live on Arc
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[var(--p-muted)]">
        Beacon V2 adds agent-signed swap and bridge execution to the same firewall model: the executor
        relays the agent&apos;s signature and cannot alter any field. The V1 proofs elsewhere on this
        page are untouched — V1 stays live.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--p-border)] p-4">
          <h3 className="text-sm font-semibold">{V2_SWAP_PROOF.title}</h3>
          <p className="mt-1 text-sm text-[var(--p-muted)]">{V2_SWAP_PROOF.detail}</p>
          <p className="mt-2 font-mono text-xs text-[var(--p-fg)]">
            In {V2_SWAP_PROOF.amountIn} · Out {V2_SWAP_PROOF.amountOut}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--p-muted)]">Block {V2_SWAP_PROOF.block}</p>
          <TxLine label="swap transaction" hash={V2_SWAP_PROOF.txHash} />
          <ProofLabels labels={V2_SWAP_PROOF.labels} />
        </div>

        <div className="rounded-xl border border-[var(--p-border)] p-4">
          <h3 className="text-sm font-semibold">{V2_SEND_PROOF.title}</h3>
          <p className="mt-1 text-sm text-[var(--p-muted)]">{V2_SEND_PROOF.detail}</p>
          <TxLine label="send transaction" hash={V2_SEND_PROOF.txHash} />
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-muted)]">To</span>
            <code className="min-w-0 truncate font-mono text-[11px] text-[var(--p-muted)]" title={V2_SEND_PROOF.to}>
              {truncate(V2_SEND_PROOF.to)}
            </code>
            <CopyButton value={V2_SEND_PROOF.to} label="recipient address" />
          </div>
          <ProofLabels labels={V2_SEND_PROOF.labels} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{V2_BRIDGE_STATUS.title}</h3>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-warn)]">
            {V2_BRIDGE_STATUS.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--p-muted)]">{V2_BRIDGE_STATUS.body}</p>
        <p className="mt-2 text-sm text-[var(--p-muted)]">{V2_BRIDGE_STATUS.limitation}</p>
        <p className="mt-2 text-sm text-[var(--p-muted)]">{V2_BRIDGE_STATUS.eoaProof.label}:</p>
        <TxLine label="EOA burn transaction" hash={V2_BRIDGE_STATUS.eoaProof.txHash} />
      </div>

      <div className="mt-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--p-muted)]">
          V2 contracts · Sourcify exact_match
        </h3>
        <ul className="mt-2 space-y-3">
          {V2_DEPLOYMENTS.map((c) => (
            <li key={c.address} className="text-sm">
              <span className="font-semibold">{c.name}</span>
              <span className="text-[var(--p-muted)]"> — {c.role}</span>
              <span className="mt-1 flex min-w-0 items-center gap-2">
                <code className="min-w-0 truncate font-mono text-[11px] text-[var(--p-muted)]" title={c.address}>
                  {truncate(c.address)}
                </code>
                <CopyButton value={c.address} label={`${c.name} address`} />
                <a
                  className="shrink-0 font-mono text-[11px] text-[var(--p-accent-text)] underline decoration-dotted underline-offset-4"
                  href={V2_SOURCIFY(c.address)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${c.name} source on Sourcify`}
                >
                  Source ↗
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
