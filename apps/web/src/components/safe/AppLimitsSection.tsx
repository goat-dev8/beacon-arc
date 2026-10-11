import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import type { SecurityPolicy } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SafeField, SafeSection } from "./safePrimitives";

/** Agents this browser session may name. Image jobs are not executable. */
export const BEACON_AGENT_OPTIONS = [
  "general",
  "signals",
  "intel",
  "portfolio",
  "swap",
  "research",
  "desk",
  "image",
  "pay",
  "risk",
  "treasury",
] as const;

/** Matches API + Beacon Safe factory demo caps (10 per action / 50 daily). */
export const DEFAULT_SAFE_POLICY: SecurityPolicy = {
  dailySpendUsdt0: 50,
  perJobLimitUsdt0: 10,
  allowedAgents: [...BEACON_AGENT_OPTIONS],
  allowedChains: [5042],
  maxImageCostUsdt0: 0.05,
  maxVideoSeconds: 60,
  emergencyPause: false,
  sessionExpiryHours: 24,
};

export function stripNonZeroGAgents(agents: string[]): string[] {
  const allowed = new Set<string>(BEACON_AGENT_OPTIONS);
  return agents.filter((a) => allowed.has(a));
}

export function AppLimitsSection({
  policy,
  setPolicy,
  receipt,
  wallet,
  onSave,
  onRevoke,
  savePending,
  revokePending,
  savedNote,
}: {
  policy: SecurityPolicy;
  setPolicy: Dispatch<SetStateAction<SecurityPolicy>>;
  receipt?: {
    spentTodayUsdt0: number;
    remainingUsdt0: number;
    perJobLimitUsdt0: number;
  };
  wallet: string | null;
  onSave: () => void;
  onRevoke: () => void;
  savePending: boolean;
  revokePending: boolean;
  savedNote: string | null;
}) {
  function toggleAgent(id: string) {
    setPolicy((p) => ({
      ...p,
      allowedAgents: p.allowedAgents.includes(id)
        ? p.allowedAgents.filter((a) => a !== id)
        : [...p.allowedAgents, id],
    }));
  }

  return (
    <SafeSection>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">
        App limits
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
        Server notes, not the vault cap
      </h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--p-muted)]">
        These fields do not move USDC. A send passes only the on-chain cap, window, allowlist, and signature. Swap and image jobs stay off.
      </p>

      {!wallet && (
        <p className="mt-4 text-sm text-[var(--p-muted)]">Connect to load and edit app limits.</p>
      )}

      {wallet && receipt && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Spent today" value={`${receipt.spentTodayUsdt0} USDC`} />
          <MiniStat label="Remaining" value={`${receipt.remainingUsdt0} USDC`} accent />
          <MiniStat label="Per send max" value={`${receipt.perJobLimitUsdt0} USDC`} />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SafeField
          label="Daily note (USDC)"
          value={policy.dailySpendUsdt0}
          onChange={(v) => setPolicy((p) => ({ ...p, dailySpendUsdt0: Number(v) || 0 }))}
          disabled={!wallet}
        />
        <SafeField
          label="Per-send note (USDC)"
          value={policy.perJobLimitUsdt0}
          onChange={(v) => setPolicy((p) => ({ ...p, perJobLimitUsdt0: Number(v) || 0 }))}
          disabled={!wallet}
        />
        <SafeField
          label="Image jobs"
          value={policy.maxImageCostUsdt0}
          onChange={(v) => setPolicy((p) => ({ ...p, maxImageCostUsdt0: Number(v) || 0 }))}
          disabled={!wallet}
          hint="Image jobs are not executable on Arc."
        />
        <SafeField
          label="Session expiry (hours)"
          value={policy.sessionExpiryHours}
          onChange={(v) => setPolicy((p) => ({ ...p, sessionExpiryHours: Number(v) || 0 }))}
          disabled={!wallet}
          hint="0 = no server session expiry. On-chain Safe session is the spend clock. Save spending policy also refreshes this."
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--p-muted)]">Named agents</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BEACON_AGENT_OPTIONS.map((id) => {
            const on = policy.allowedAgents.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={!wallet}
                onClick={() => toggleAgent(id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors disabled:opacity-40",
                  on
                    ? "border-[var(--p-accent)]/50 bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]"
                    : "border-[var(--p-border-strong)] text-[var(--p-muted)] hover:bg-[var(--p-hover)]",
                )}
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 flex items-center gap-3 text-sm" htmlFor="safe-app-emergency-pause">
        <input
          id="safe-app-emergency-pause"
          name="emergencyPause"
          type="checkbox"
          checked={policy.emergencyPause}
          disabled={!wallet}
          onChange={(e) => setPolicy((p) => ({ ...p, emergencyPause: e.target.checked }))}
          className="size-4 accent-[#3ecf8e]"
        />
        Pause all API spends
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!wallet || savePending}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--p-accent)] px-5 py-2.5 text-sm font-medium text-[var(--p-on-accent)] disabled:opacity-40"
        >
          {savePending && <Loader2 className="size-4 animate-spin" />}
          Save app limits
        </button>
        <button
          type="button"
          disabled={!wallet || revokePending}
          onClick={onRevoke}
          className="rounded-full border border-[var(--p-danger)]/45 px-5 py-2.5 text-sm text-[var(--p-danger)] disabled:opacity-40"
        >
          Revoke API access
        </button>
      </div>
      {savedNote && <p className="mt-2 text-sm text-[var(--p-accent-text)]">{savedNote}</p>}
    </SafeSection>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--p-radius-sm)] border px-3 py-2.5",
        accent
          ? "border-[var(--p-accent)]/35 bg-[var(--p-accent-soft)]"
          : "border-[var(--p-border)] bg-[var(--p-surface-2)]",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--p-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-xl",
          accent && "text-[var(--p-accent-text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
