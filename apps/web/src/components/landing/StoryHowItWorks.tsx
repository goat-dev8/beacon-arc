import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MoneyPathDiagram } from "@/components/diagrams/MoneyPathDiagram";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    id: "signal",
    title: "Grant",
    body: "The owner names the agent, the scope, and when the grant expires.",
    rail: "Grant",
  },
  {
    id: "quote",
    title: "Cap",
    body: "Beacon prices the send in USDC against the per-payment cap and the rolling window.",
    rail: "Policy",
  },
  {
    id: "policy",
    title: "Allow",
    body: "The recipient must be allowlisted and not blocked. A miss leaves a reason. Funds do not move.",
    rail: "Allowlist",
  },
  {
    id: "pay",
    title: "Sign",
    body: "The agent signs the EIP-712 action. The executor relays that exact payload.",
    rail: "EIP-712",
  },
  {
    id: "execute",
    title: "Send",
    body: "The vault calls USDC transfer. Over-cap, wrong recipient, and stale policy all revert.",
    rail: "USDC",
  },
  {
    id: "receipt",
    title: "Receipt",
    body: "The registry records the action. Open it on the Arc explorer. Proof you can click.",
    rail: "Explorer",
  },
] as const;

/** Dark Greptile-style “how it works” chapter with dashed panels */
export function StoryHowItWorks() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const stage = STAGES[active];

  return (
    <section id="story" className="landing-slate relative overflow-hidden border-b border-line py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] landing-slate-grid"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-[#f4a2d8] md:text-5xl">
          How Beacon turns intent into proof
        </h2>
        <p className="mt-4 max-w-2xl text-base text-white/75 md:text-lg">
          Six beats. Same loop every time. Hover a stage to see what happens next.
        </p>
        <p className="mx-auto mt-8 w-fit border border-white/20 bg-black/30 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
          How it works
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STAGES.slice(0, 3).map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "border border-dashed p-5 text-left transition-colors",
                active === i ? "border-signal bg-white/5" : "border-white/25 bg-transparent hover:border-white/40",
              )}
            >
              <p className="font-mono text-[11px] text-signal">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-2 font-display text-lg font-semibold text-white">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STAGES.slice(3).map((s, i) => {
            const idx = i + 3;
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setActive(idx)}
                onFocus={() => setActive(idx)}
                onClick={() => setActive(idx)}
                className={cn(
                  "border border-dashed p-5 text-left transition-colors",
                  active === idx ? "border-signal bg-white/5" : "border-white/25 bg-transparent hover:border-white/40",
                )}
              >
                <p className="font-mono text-[11px] text-signal">{String(idx + 1).padStart(2, "0")}</p>
                <p className="mt-2 font-display text-lg font-semibold text-white">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
              </button>
            );
          })}
        </div>

        <motion.div
          key={stage.id}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-10 border border-dashed border-white/25 bg-black/25 p-6 md:p-8"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal">{stage.rail}</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{stage.title}</p>
          <p className="mt-3 max-w-2xl text-white/70">{stage.body}</p>
          <div className="mt-8 [&_p]:text-white/70 [&_.text-ink]:text-white [&_.text-ink-muted]:text-white/70 [&_.text-ink-faint]:text-white/45 [&_.bg-surface]:bg-white/5 [&_.border-line]:border-white/20 [&_.bg-signal]:bg-signal">
            <MoneyPathDiagram activeIndex={Math.min(active, 6)} autoPlay={false} compact />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
