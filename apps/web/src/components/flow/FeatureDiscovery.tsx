import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Crosshair,
  Landmark,
  Layers,
  LineChart,
  PieChart,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type DiscoveryFeature = {
  id: string;
  title: string;
  blurb: string;
  prompt: string;
  icon: LucideIcon;
  accent?: boolean;
};

export const DISCOVERY_FEATURES: DiscoveryFeature[] = [
  {
    id: "vault",
    title: "Vault",
    blurb: "Read the live Arc vault: USDC balance, cap, window, and policy version.",
    prompt: "Show my vault balance and policy.",
    icon: PieChart,
    accent: true,
  },
  {
    id: "send",
    title: "Signed send",
    blurb: "The agent signs recipient, amount, nonce, and deadline. The executor cannot edit them.",
    prompt: "Prepare a USDC send to an allowlisted recipient.",
    icon: Sparkles,
    accent: true,
  },
  {
    id: "allow",
    title: "Allowlist",
    blurb: "A recipient is payable only after the owner allowlists it. Blocked addresses stay blocked.",
    prompt: "Who can this vault pay?",
    icon: Shield,
    accent: true,
  },
  {
    id: "cap",
    title: "Over cap",
    blurb: "An amount above the per-payment cap reverts. The nonce does not move.",
    prompt: "What happens if a send is over the cap?",
    icon: Shield,
  },
  {
    id: "swap",
    title: "Swap",
    blurb: "Uniswap V2 can quote USDC to EURC. This vault has no swap function, so Beacon will not trade.",
    prompt: "Can I swap USDC?",
    icon: ArrowLeftRight,
  },
  {
    id: "bridge",
    title: "CCTP",
    blurb: "CCTP domain 26 is on Arc. This vault cannot burn or mint, so a burn is not a completed bridge.",
    prompt: "Can I bridge USDC with CCTP?",
    icon: Landmark,
  },
  {
    id: "privacy",
    title: "Privacy",
    blurb: "Arc Privacy Sector is planned and is not on mainnet. Beacon will not report a private transfer.",
    prompt: "Is private settlement on?",
    icon: Layers,
  },
  {
    id: "pq",
    title: "Post-quantum",
    blurb: "The PQ precompile is 1 byte on mainnet. This is not a PQ wallet.",
    prompt: "Is the PQ signer live?",
    icon: Crosshair,
  },
  {
    id: "x402",
    title: "x402",
    blurb: "x402 stays off until a Circle facilitator key is configured.",
    prompt: "Is x402 enabled?",
    icon: BarChart3,
  },
  {
    id: "erc8004",
    title: "ERC-8004",
    blurb: "Beacon has not matched the registry implementation selectors, so it does not register.",
    prompt: "Is ERC-8004 registration live?",
    icon: LineChart,
  },
  {
    id: "verify",
    title: "Verify",
    blurb: "Open a receipt from the registry. The Arc explorer is the proof.",
    prompt: "Verify the last USDC send.",
    icon: Boxes,
  },
  {
    id: "pause",
    title: "Pause",
    blurb: "The owner can freeze the vault. The executor cannot change policy.",
    prompt: "Who can pause the vault?",
    icon: Layers,
  },
];

type Props = {
  onTry: (prompt: string, mode?: "fill" | "send") => void;
  onOpenWhyZeroG?: () => void;
};

export function FeatureDiscovery({ onTry, onOpenWhyZeroG }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[42rem] px-3 pb-2 pt-1 md:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-[var(--p-fg)]">
            What Beacon can do
          </h2>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--p-muted)]">
            Pick a rail to fill the composer, or send it straight into Flow.
          </p>
        </div>
        {onOpenWhyZeroG && (
          <button
            type="button"
            onClick={onOpenWhyZeroG}
            className="min-h-9 rounded-[var(--p-radius-sm)] border border-[var(--p-border)] bg-[var(--p-surface)] px-3 text-[12px] text-[var(--p-muted)] hover:text-[var(--p-fg)]"
          >
            Why Arc?
          </button>
        )}
      </div>

      <div className="grid grid-flow-dense gap-2 sm:grid-cols-2">
        {DISCOVERY_FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: reduce ? 0 : i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className={
                feature.accent
                  ? "group flex flex-col rounded-[var(--p-radius)] border border-[var(--p-accent)]/35 bg-[var(--p-accent-soft)] p-3.5 transition-colors hover:border-[var(--p-accent)]/60"
                  : "group flex flex-col rounded-[var(--p-radius)] border border-[var(--p-border)] bg-[var(--p-card)] p-3.5 transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-surface)]"
              }
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--p-radius-sm)] bg-[var(--p-card)] text-[var(--p-accent-text)] ring-1 ring-[var(--p-border)]">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[14px] font-semibold tracking-tight text-[var(--p-fg)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-muted)]">{feature.blurb}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onTry(feature.prompt, "fill")}
                  className="min-h-8 flex-1 rounded-[var(--p-radius-sm)] border border-[var(--p-border)] bg-[var(--p-surface)] px-2.5 text-[12px] font-medium text-[var(--p-fg)] hover:bg-[var(--p-hover)]"
                >
                  Try now
                </button>
                <button
                  type="button"
                  onClick={() => onTry(feature.prompt, "send")}
                  className="min-h-8 rounded-[var(--p-radius-sm)] bg-signal px-2.5 text-[12px] font-medium text-[var(--p-on-accent)]"
                >
                  Send
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
