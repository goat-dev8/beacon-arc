import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";

const RAILS = [
  {
    id: "safe",
    title: "Beacon vault",
    why: "An agent needs a prepaid envelope, not an open hot wallet.",
    how: "Deposit USDC once. Agents draw only under your caps.",
  },
  {
    id: "policy",
    title: "Spending policy",
    why: "Every send must pass limits before money moves.",
    how: "Per-payment cap, rolling window, policy version. The owner can pause or revoke.",
  },
  {
    id: "allow",
    title: "Allowlist",
    why: "A signature is not permission to pay anyone.",
    how: "The owner names recipients. A blocked address cannot receive USDC.",
  },
  {
    id: "sign",
    title: "Signed action",
    why: "The executor must not choose the payment.",
    how: "The agent signs recipient, amount, nonce, and deadline. The vault checks the signature, then calls USDC.",
  },
  {
    id: "verify",
    title: "/verify",
    why: "Anyone should inspect proof without a wallet.",
    how: "The receipt registry plus the Arc explorer. On-chain is authoritative.",
  },
  {
    id: "off",
    title: "Not in this deploy",
    why: "A missing rail must stay visibly off.",
    how: "Swap, CCTP, privacy, post-quantum signing, x402, and ERC-8004 do not move USDC.",
  },
] as const;

/** Greptile-style dashed bento — no heavy rounded cards */
export function ProtectionStory() {
  const reduce = useReducedMotion();

  return (
    <section id="protect" className="border-b border-line bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          [ Protect ]
        </p>
        <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
          Why each piece exists
        </h2>
        <p className="mt-4 max-w-lg text-ink-muted">
          Visual answers, not a glossary. Every rail maps to Arc USDC.
        </p>

        <div className="mt-14 grid grid-flow-dense gap-0 border border-dashed border-line md:grid-cols-6">
          {RAILS.map((r, i) => {
            const wide = i === 0 || i === 3;
            return (
              <motion.article
                key={r.id}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.45 }}
                className={
                  wide
                    ? "border-b border-r border-dashed border-line bg-dusk p-7 text-paper md:col-span-3 md:p-8"
                    : "border-b border-r border-dashed border-line bg-surface p-6 md:col-span-2 md:p-7"
                }
              >
                <h3
                  className={
                    wide
                      ? "font-display text-2xl font-bold tracking-tight"
                      : "font-display text-lg font-bold tracking-tight text-ink"
                  }
                >
                  {r.title}
                </h3>
                <p className={wide ? "mt-3 text-paper/80" : "mt-3 text-sm text-ink-muted"}>
                  {r.why}
                </p>
                <p
                  className={
                    wide
                      ? "mt-4 border-t border-white/15 pt-4 font-mono text-[12px] text-signal"
                      : "mt-3 font-mono text-[11px] text-ink-faint"
                  }
                >
                  {r.how}
                </p>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            to="/start"
            className="inline-flex h-12 items-center bg-signal px-7 font-display text-sm font-semibold text-ink clip-facet-right hover:brightness-105 active:scale-[0.98]"
          >
            Get Started
          </Link>
          <Link
            to="/flow/vault"
            className="inline-flex h-12 items-center border border-dashed border-line bg-surface px-6 font-display text-sm text-ink hover:bg-paper-2 active:scale-[0.98]"
          >
            Try the vault journey
          </Link>
        </div>
      </div>
    </section>
  );
}
