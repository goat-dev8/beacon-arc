import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AcceptanceDiagram,
  EscrowDiagram,
  PreparingDiagram,
  ReceiptDiagram,
} from "@/components/diagrams/BeaconDiagrams";
import { PixelWave, Ruler, SectionLabel } from "@/components/landing/PixelWave";
import { FacetCtaPair } from "@/components/ui/Button";
import { CONTRACTS, NETWORK, V2_CONTRACTS } from "@/lib/chain";

/** Greptile-style manifesto quote band */
export function ManifestoQuote() {
  return (
    <section className="border-b border-line bg-paper py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">[ Arc USDC ]</p>
        <blockquote className="mt-6 font-display text-2xl font-medium leading-snug tracking-tight text-ink md:text-4xl md:leading-[1.15]">
          &ldquo;The agent signs the payment. The executor cannot change the recipient or the amount.&rdquo;
        </blockquote>
        <p className="mt-6 font-mono text-sm text-ink-muted">Signal · Quote · Policy · Pay · Execute · Receipt</p>
      </div>
    </section>
  );
}

export function WhatIsBeacon() {
  const reduce = useReducedMotion();

  return (
    <section id="what" className="border-b border-line bg-surface py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionLabel>Product</SectionLabel>
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="max-w-xl font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
              One vault. A signed USDC action.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              A send pays an allowlisted address. A swap uses the pinned USDC/EURC pool and returns EURC to the vault.
            </p>
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="border border-dashed border-line bg-paper p-6 md:p-8"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">Honest loop</p>
            <p className="mt-3 font-display text-xl font-medium tracking-tight text-ink md:text-2xl">
              Signal · Quote · Policy · Pay · Execute · Receipt
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              No invented proofs. No blank void. Every step stays visible before you sign.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function QualityBand() {
  return (
    <section id="quality" className="relative bg-dusk text-paper">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="flex justify-center pt-8">
        <span className="bg-rose px-4 py-1.5 font-mono text-[11px] tracking-wide text-ink">
          See how quality works
        </span>
      </div>
      <div className="mx-auto max-w-4xl px-5 pb-0 pt-10 text-center">
        <SectionLabel className="text-white/45">Quality</SectionLabel>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-paper md:text-5xl">
          Policy before pay
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/65">
          Spend limits gate every settle. Quotes stay visible. Receipts stay on-chain.
        </p>
      </div>
      <PixelWave className="mt-10 h-28 w-full md:h-40" />
    </section>
  );
}

export function QualitySection() {
  return (
    <section className="border-b border-line bg-paper py-20">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-0 border border-dashed border-line lg:grid-cols-2">
          <div className="border-b border-dashed border-line bg-surface p-6 lg:border-r">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-faint">
              Acceptance path
            </p>
            <AcceptanceDiagram />
          </div>
          <div className="border-b border-dashed border-line bg-surface p-6">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-faint">
              Payment rule
            </p>
            <EscrowDiagram />
          </div>
          <div className="border-b border-dashed border-line bg-surface p-6 lg:border-b-0 lg:border-r">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-faint">
              Preparing a send
            </p>
            <PreparingDiagram />
          </div>
          <div className="flex flex-col items-center bg-surface p-6">
            <p className="mb-4 self-start font-mono text-[11px] uppercase tracking-widest text-ink-faint">
              Receipt
            </p>
            <ReceiptDiagram />
          </div>
        </div>
        <Ruler />
      </div>
    </section>
  );
}

export function ContractsSection() {
  return (
    <section id="receipts" className="border-b border-line bg-surface py-20">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionLabel>On-chain</SectionLabel>
        <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Real contracts on Arc
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-muted">
          The vault calls USDC itself. A signed action is the only way an agent payment moves.
        </p>
        <dl className="mx-auto mt-10 grid max-w-3xl gap-0 border border-dashed border-line font-mono text-xs">
          {[
            ["Network", `${NETWORK.name} · chain ${NETWORK.chainId}`, null],
            ["USDC", CONTRACTS.usdc, CONTRACTS.usdc],
            ["Active vault", V2_CONTRACTS.vault, V2_CONTRACTS.vault],
            ["Active factory", V2_CONTRACTS.vaultFactory, V2_CONTRACTS.vaultFactory],
            ["Active registry", V2_CONTRACTS.receiptRegistry, V2_CONTRACTS.receiptRegistry],
            ["First vault, send only", CONTRACTS.vault, CONTRACTS.vault],
            ["First factory", CONTRACTS.vaultFactory, CONTRACTS.vaultFactory],
            ["First registry", CONTRACTS.receiptRegistry, CONTRACTS.receiptRegistry],
          ].map(([k, v, href], i, arr) => (
            <div
              key={k}
              className={`flex flex-col gap-1 bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                i < arr.length - 1 ? "border-b border-dashed border-line" : ""
              }`}
            >
              <dt className="text-ink-faint">{k}</dt>
              <dd className="break-all text-ink">
                {href ? (
                  <a
                    href={`${NETWORK.explorer}/address/${href}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line hover:text-signal-deep"
                  >
                    {v}
                  </a>
                ) : (
                  v
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function truncateHash(h: string) {
  return h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

/** Truncated hash with a copy button — full value stays on the explorer link. */
function CopyHash({ value, tone = "dark" }: { value: string; tone?: "dark" | "light" }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <code
        className={`min-w-0 truncate font-mono text-[11px] leading-relaxed ${
          tone === "dark" ? "text-white/45" : "text-ink-faint"
        }`}
        title={value}
      >
        {truncateHash(value)}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(value)
            .then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            })
            .catch(() => setCopied(false));
        }}
        aria-label={`Copy full transaction hash ${value}`}
        className={`inline-flex h-7 shrink-0 items-center px-2 font-mono text-[11px] underline decoration-dotted underline-offset-4 transition-colors ${
          tone === "dark"
            ? "text-white/60 decoration-white/30 hover:text-paper"
            : "text-ink-muted decoration-ink-faint hover:text-ink"
        }`}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </span>
  );
}

export function LiveProofSection() {
  const reduce = useReducedMotion();

  const contracts = [
    {
      name: "BeaconUsdcVault V2",
      role: "Live firewall. Holds USDC, sends, and swaps.",
      address: V2_CONTRACTS.vault,
    },
    {
      name: "BeaconVaultFactory V2",
      role: "One live vault per owner. A second create reverts.",
      address: V2_CONTRACTS.vaultFactory,
    },
    {
      name: "BeaconReceiptRegistry V2",
      role: "Every live execution writes a receipt here.",
      address: V2_CONTRACTS.receiptRegistry,
    },
    {
      name: "BeaconUsdcVault",
      role: "First vault. Send only. Immutable.",
      address: CONTRACTS.vault,
    },
    {
      name: "BeaconVaultFactory",
      role: "Created the first vault.",
      address: CONTRACTS.vaultFactory,
    },
    {
      name: "BeaconReceiptRegistry",
      role: "Receipts for the first vault.",
      address: CONTRACTS.receiptRegistry,
    },
  ];

  const refusal = {
    hash: "0x39eb0351531f57b4c8167bc508d066a3d48fa297cdc79eacf1c63fa21756fd03",
    block: "25859160",
    revert: "reverted · zero logs",
  };

  const sends = [
    {
      label: "Live vault send",
      detail: "0.001 USDC · 1,000 base units · agent-signed, executor-relayed",
      hash: "0xa80b79d47e760075ac574304a565c1fcfeb98eb33e1f0e77be7fa8984a653fe8",
      receipt: "0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f",
      block: "25858345",
      to: "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd",
    },
    {
      label: "Live vault swap",
      detail: "0.001 USDC → 891 EURC base units · output returned to the vault",
      hash: "0x1a3e7cea053ea5c994e9ffd22f6962b97e4e86fbe2e860dc7f1a4175a1726c7f",
      receipt: "0x0fa111b17b2664dfc6f7a433cdbe270e38343e5dc65a6995de430dd5b7a27968",
      block: "25859531",
      to: "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe",
    },
  ];

  const earlier = [
    {
      label: "First send",
      hash: "0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab",
      receipt: "0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a",
    },
    {
      label: "First over-cap",
      hash: "0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83",
      receipt: null,
    },
    {
      label: "First third-party send",
      hash: "0xa04c49304913f2e9a553ed4882e350cb42a009a9f148ce08dcae3f817f5d11d3",
      receipt: "0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30",
    },
    {
      label: "Larger live swap",
      hash: "0xab5c69330806929814c2fb059a7d33a6d50b46751dde3f3c53e413aeda2e7d8d",
      receipt: null,
    },
  ];

  const receiptId = "0x2a67ac481adb62435ddd8f8fd080423c95d50614e143600bd2b2a63d8fd93b0f";

  return (
    <section id="live-proof" className="relative border-b border-line bg-dusk py-24 text-paper md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 border border-signal/40 bg-signal/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
            <span className="inline-block h-2 w-2 rounded-full bg-signal" />
            Live on Arc mainnet · chain 5042
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Proof, not promises.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
            Every claim below opens on-chain. No wallet required to inspect it.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-0 border border-white/15 sm:grid-cols-3">
          {[
            ["0.030 USDC", "recorded input, V1 + V2"],
            ["8 executions", "Recorded events"],
            ["3 refusals", "reverted calls"],
          ].map(([big, small], i) => (
            <div
              key={big}
              className={`px-6 py-6 text-center ${i < 2 ? "border-b border-white/15 sm:border-b-0 sm:border-r" : ""}`}
            >
              <p className="font-display text-2xl font-extrabold tracking-tight text-signal md:text-3xl">
                {big}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">
                {small}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 grid gap-4 lg:grid-cols-3">
          {contracts.map((c, i) => (
            <motion.div
              key={c.address}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              className="border border-white/15 bg-dusk-2 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                  {c.name}
                </p>
                <span className="inline-flex items-center gap-1.5 border border-signal/40 bg-signal/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal">
                  <span aria-hidden="true">✓</span> exact_match
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{c.role}</p>
              <p className="mt-4 break-all font-mono text-xs leading-relaxed text-paper/85">
                {c.address}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <a
                  href={`https://sourcify.dev/server/v2/contract/5042/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
                >
                  Verified source ↗
                </a>
                <a
                  href={`${NETWORK.explorer}/address/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-white/55 underline decoration-white/25 underline-offset-4 hover:text-paper"
                >
                  Explorer ↗
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Featured refusal — the money shot */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mx-auto mt-12 max-w-6xl border border-danger/40 bg-dusk-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/25 px-6 py-4 md:px-8">
            <span className="inline-flex items-center gap-2 bg-danger/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-danger">
              <span aria-hidden="true">✕</span> Refused · status 0x0
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
              The money shot
            </span>
          </div>
          <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
            <div>
              <h3 className="font-display text-3xl font-extrabold tracking-tight text-paper md:text-4xl">
                The vault said no.
              </h3>
              <p className="mt-3 max-w-md leading-relaxed text-white/65">
                A send above the cap was broadcast to the live vault. The transaction reverted.
                Zero logs. No USDC moved, and the nonce was not spent. The first refusal, selector
                OverCap, is still on the first vault.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 font-mono text-xs">
                <div>
                  <dt className="uppercase tracking-[0.12em] text-white/40">Block</dt>
                  <dd className="mt-1 text-paper">{refusal.block}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.12em] text-white/40">Revert</dt>
                  <dd className="mt-1 text-danger">{refusal.revert}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.12em] text-white/40">USDC moved</dt>
                  <dd className="mt-1 text-paper">0.000000</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.12em] text-white/40">Nonce spent</dt>
                  <dd className="mt-1 text-paper">none</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col justify-center gap-4 border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
                  Transaction
                </p>
                <div className="mt-2">
                  <CopyHash value={refusal.hash} />
                </div>
              </div>
              <a
                href={`${NETWORK.explorer}/tx/${refusal.hash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-fit items-center bg-danger px-6 font-mono text-sm font-bold text-dusk transition-transform hover:-translate-y-0.5"
              >
                See the revert on the explorer ↗
              </a>
              <p className="font-mono text-[11px] leading-relaxed text-white/40">
                Open it: the explorer shows a failed transaction. That failure is the product.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mx-auto mt-4 grid max-w-6xl gap-4 md:grid-cols-2">
          {sends.map((t, i) => (
            <motion.div
              key={t.hash}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              className="group flex flex-col border border-white/15 bg-dusk-2 p-6 transition-colors hover:border-signal/50"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 bg-signal/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">
                  <span aria-hidden="true">●</span> Executed · status 0x1
                </span>
                <a
                  href={`${NETWORK.explorer}/tx/${t.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${t.label} on the Arc explorer`}
                  className="font-mono text-xs text-white/45 transition-colors group-hover:text-signal"
                >
                  ↗
                </a>
              </div>
              <p className="mt-4 font-display text-xl font-bold tracking-tight text-paper">
                {t.label}
              </p>
              <p className="mt-1 font-mono text-xs text-white/55">{t.detail}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[11px]">
                <div>
                  <dt className="uppercase tracking-[0.12em] text-white/40">Block</dt>
                  <dd className="mt-1 text-paper/85">{t.block}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="uppercase tracking-[0.12em] text-white/40">To</dt>
                  <dd className="mt-1 truncate text-paper/85" title={t.to}>
                    {truncateHash(t.to)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <CopyHash value={t.hash} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4">
                <a
                  href={`${NETWORK.explorer}/tx/${t.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-white/55 underline decoration-white/25 underline-offset-4 hover:text-paper"
                >
                  Explorer ↗
                </a>
                {t.receipt && (
                  <a
                    href={`/verify/${t.receipt}`}
                    className="font-mono text-xs text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
                  >
                    Receipt ↗
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.a
          href={`/verify/${receiptId}`}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="group mx-auto mt-4 flex max-w-6xl flex-col gap-2 border border-signal/40 bg-signal/10 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
              The receipt — readable without a wallet
            </p>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              0.001 USDC · 1,000 base units
            </p>
            <p className="mt-1 font-mono text-xs text-white/55">
              Registry proof + Arc explorer. On-chain is authoritative.
            </p>
          </div>
          <span className="shrink-0 bg-signal px-6 py-3 font-mono text-sm font-bold text-dusk transition-transform group-hover:-translate-y-0.5">
            Open receipt →
          </span>
        </motion.a>

        <div className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-x-5 gap-y-2 border border-white/10 px-6 py-4">
          {earlier.map((item) => (
            <span key={item.hash} className="inline-flex gap-3">
              <a
                href={`${NETWORK.explorer}/tx/${item.hash}`}
                className="font-mono text-[11px] text-white/55 underline decoration-white/25 underline-offset-4 hover:text-paper"
              >
                {item.label}
              </a>
              {item.receipt ? (
                <a
                  href={`/verify/${item.receipt}`}
                  className="font-mono text-[11px] text-white/55 underline decoration-white/25 underline-offset-4 hover:text-paper"
                >
                  receipt
                </a>
              ) : null}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center font-mono text-[11px] leading-relaxed text-white/40">
          Recorded input across V1 and V2, not the vault balance. 0.030 USDC · 8 Recorded events · 3 reverted calls. Re-read at block 26001492 on 2026-10-14T23:38:49Z. The active vault held 0.01 USDC and 0.006245 EURC.{" "}
          <a
            href={NETWORK.explorer}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-white/25 underline-offset-4 hover:text-paper"
          >
            Browse all activity on the Arc explorer ↗
          </a>
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-dusk py-28 text-paper md:py-36">
      <div className="mx-auto max-w-6xl px-5 text-center md:px-8">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
          Try it. Eight steps, on the live vault.
        </p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">
          Run the vault journey yourself.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/65">
          Deposit. Grant the agent. Set the cap. Sign the USDC action. Watch the
          receipt land on Arc, or watch the vault refuse.
        </p>
        <div className="mt-8 flex justify-center overflow-x-auto px-2">
          <FacetCtaPair left="Get Started" right="Open the vault" leftTo="/start" rightTo="/flow/vault" size="md" />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 text-sm text-ink-faint md:flex-row md:items-center md:px-8">
        <div>
          <p>© {new Date().getFullYear()} Beacon</p>
          <p className="mt-1 font-mono text-xs">
            Arc USDC. Signed action to receipt.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs"
        >
          <a
            href={NETWORK.explorer}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            Arc explorer ↗
          </a>
          <a
            href="https://github.com/goat-dev8/beacon-arc"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            GitHub ↗
          </a>
          <a
            href="https://github.com/goat-dev8/beacon-arc#three-minute-review"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            Judge quickstart ↗
          </a>
          <a href="/flow" className="underline-offset-4 hover:text-ink hover:underline">
            Open Flow
          </a>
        </nav>
      </div>
    </footer>
  );
}
