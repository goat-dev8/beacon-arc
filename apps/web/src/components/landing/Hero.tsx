import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { FacetCtaPair } from "@/components/ui/Button";

/**
 * Greptile-faithful hero (structure only):
 * - paper + crosshair ruled background
 * - dashed vertical rails
 * - H1 top-left, CTA bottom-left
 * - halftone asset absolute, bind-to-bg (no card), signal outline glow
 */
export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="landing-hero relative overflow-hidden border-b border-line">
      <div
        className="pointer-events-none absolute inset-y-0 left-8 hidden w-px border-l border-dashed border-line md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-8 hidden w-px border-r border-dashed border-line md:block"
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute -right-8 bottom-0 z-[1] hidden w-[min(52vw,36rem)] select-none md:block lg:-right-4 lg:w-[min(48vw,42rem)] xl:w-[44rem]"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden
      >
        <div className={reduce ? undefined : "beacon-bind-glow"}>
          <img
            src="/brand/halftone-beacon-bind.png"
            alt=""
            width={704}
            height={704}
            className="h-auto w-full object-contain object-bottom"
            draggable={false}
          />
        </div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] mx-auto w-[78%] max-w-sm opacity-40 md:hidden"
        aria-hidden
      >
        <img
          src="/brand/halftone-beacon-bind.png"
          alt=""
          width={640}
          height={640}
          className="h-auto w-full object-contain object-bottom opacity-50"
          draggable={false}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(100dvh,52rem)] max-w-7xl flex-col justify-between px-5 pb-12 pt-16 md:px-16 md:pb-24 md:pt-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-signal-deep">
            Live on Arc mainnet · chain 5042
          </p>
          <h1 className="max-w-[12em] font-display text-[clamp(2.05rem,6.4vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink">
            Give AI agents a budget, not a blank cheque.
          </h1>
        </motion.div>

        <motion.div
          className="relative z-10 max-w-2xl pb-4"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-base leading-relaxed tracking-tight text-ink-muted sm:text-xl md:text-2xl">
            Policy-bounded USDC sends and swaps. Agent-signed, enforced by the Vault, verifiable on Arc.
          </p>
          <ol className="mt-6 grid max-w-xl grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-4">
            {["Owner policy", "Agent signs", "Vault enforces", "Arc proves"].map((step, index) => (
              <li key={step} className="border border-dashed border-line bg-paper/80 px-3 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  0{index + 1}
                </span>
                <p className="mt-1 font-display text-sm font-semibold tracking-tight text-ink">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 md:hidden">
            <FacetCtaPair
              left="Open Beacon"
              right="Inspect live proofs"
              leftTo="/flow"
              rightTo="#live-proof"
              size="md"
            />
          </div>
          <div className="mt-6 hidden md:block">
            <FacetCtaPair
              left="Open Beacon"
              right="Inspect live proofs"
              leftTo="/flow"
              rightTo="#live-proof"
              size="lg"
            />
          </div>
          <Link
            to="/flow/vault"
            className="mt-4 inline-flex items-center gap-1 font-mono text-sm tracking-[0.35px] text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Open the vault
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/** Greptile-style ruled strip under hero — Beacon rails as wordmarks */
export function HeroTrustStrip() {
  const rails = ["USDC", "Policy", "Allowlist", "EIP-712", "Vault", "Receipt", "Arc"];
  return (
    <div className="border-b border-line bg-paper">
      <div className="flex items-center gap-6 px-6 py-2 md:px-16">
        <div className="h-1.5 flex-1 opacity-30 landing-crosshair-tick" aria-hidden />
        <p className="relative shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <span className="absolute inset-x-[-0.25rem] inset-y-[-0.125rem] -z-10 bg-signal/25" aria-hidden />
          Powered by Arc USDC
        </p>
        <div className="h-1.5 flex-1 opacity-30 landing-crosshair-tick" aria-hidden />
      </div>
      <div className="grid grid-cols-2 border-t border-dashed border-line sm:grid-cols-4 lg:grid-cols-7">
        {rails.map((r) => (
          <div
            key={r}
            className="flex h-14 items-center justify-center border-b border-r border-dashed border-line font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint last:border-r-0"
          >
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}
