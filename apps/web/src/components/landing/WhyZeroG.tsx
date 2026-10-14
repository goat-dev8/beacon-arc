import { motion, useReducedMotion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { SectionLabel } from "@/components/landing/PixelWave";

export const WHY_ZEROG_ITEMS = [
  {
    id: "usdc",
    title: "USDC is the money",
    body: "Arc USDC is the only token this vault spends. Native gas and ERC-20 USDC are the same pool. Beacon never adds them together.",
  },
  {
    id: "policy",
    title: "Policy you can read",
    body: "The owner sets the per-payment cap, the daily window, and the policy version. An over-cap action reverts and does not spend the nonce.",
  },
  {
    id: "allowlist",
    title: "Recipients are named",
    body: "The vault pays an address only after the owner allowlists it. A blocked recipient cannot receive USDC.",
  },
  {
    id: "sign",
    title: "The agent signs",
    body: "The agent signs an EIP-712 action: grant, recipient, amount, nonce, deadline, and policy version. The executor cannot edit those fields.",
  },
  {
    id: "vault",
    title: "The vault calls transfer",
    body: "Beacon builds the USDC transfer itself. There is no executor-chosen calldata and no arbitrary router command.",
  },
  {
    id: "swap",
    title: "The agent swaps",
    body: "Uniswap v3 quotes USDC to EURC. The granted agent signs executeSwap on the live vault. Output returns to the vault. The first vault cannot swap.",
  },
  {
    id: "unavailable",
    title: "Unavailable stays unavailable",
    body: "CCTP, privacy, post-quantum signing, x402, and ERC-8004 are capability flags only. None of them move USDC.",
  },
  {
    id: "receipts",
    title: "Proof you can click",
    body: "A successful send writes a receipt. /verify reads the registry and the explorer. No wallet is required to inspect it.",
  },
] as const;

/** Full landing section. */
export function WhyZeroGSection() {
  const reduce = useReducedMotion();

  return (
    <section id="why-arc" className="border-b border-line bg-paper py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionLabel>Why Arc</SectionLabel>
        <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
          Built on rails that prove themselves
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-ink-muted">
          Beacon holds USDC on Arc. You set the rules. The agent signs. The receipt is the proof.
        </p>

        <div className="mt-14 grid grid-flow-dense gap-0 border border-dashed border-line sm:grid-cols-2 lg:grid-cols-3">
          {WHY_ZEROG_ITEMS.map((item, i) => (
            <motion.article
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.4 }}
              className="border-b border-r border-dashed border-line bg-surface p-6 md:p-7"
            >
              <h3 className="font-display text-lg font-bold tracking-tight text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Compact drawer for Flow top bar / discovery. */
export function WhyZeroGDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close Why Arc"
            className="fixed inset-0 z-[70] bg-black/45"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="why-arc-drawer-title"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col border-l border-[var(--p-border)] bg-[var(--p-rail)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--p-border)] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--p-faint)]">
                  Arc rails
                </p>
                <h2
                  id="why-arc-drawer-title"
                  className="font-display text-[16px] font-semibold text-[var(--p-fg)]"
                >
                  Why Arc
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-[var(--p-radius-sm)] text-[var(--p-faint)] hover:bg-[var(--p-hover)] hover:text-[var(--p-fg)]"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-5 text-[13px] leading-relaxed text-[var(--p-muted)]">
                Beacon runs on Arc so every allowed USDC payment can end in a receipt you can open.
              </p>
              <ul className="space-y-4">
                {WHY_ZEROG_ITEMS.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--p-radius)] border border-[var(--p-border)] bg-[var(--p-card)] p-4"
                  >
                    <h3 className="font-display text-[14px] font-semibold text-[var(--p-fg)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--p-muted)]">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
