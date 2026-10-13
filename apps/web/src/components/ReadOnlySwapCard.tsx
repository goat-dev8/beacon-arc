import type { SwapQuote } from "@/lib/arcApi";
import { formatTokenAmount } from "@/lib/format";

export const READ_ONLY_QUOTE_BANNER =
  "Read-only quote. The live vault has no swap function — Beacon will not trade.";
export const SWAP_OFF_LABEL = "Swaps stay off — the vault will not trade";

/** Permanent honesty banner. Identical everywhere a swap quote is shown. */
export function ReadOnlyQuoteBanner({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90 ${className}`}
    >
      {READ_ONLY_QUOTE_BANNER}
    </p>
  );
}

/** The only "action" a swap card may carry: permanently disabled. */
export function SwapOffButton() {
  return (
    <button
      type="button"
      disabled
      title="The live vault has no swap function. This quote can never become a trade."
      className="mt-4 cursor-not-allowed rounded-full bg-[var(--p-border)] px-5 py-2 text-sm font-medium text-[var(--p-muted)] ring-1 ring-[var(--p-border-strong)]"
    >
      {SWAP_OFF_LABEL}
    </button>
  );
}

function baseUnitsToHuman(base: string | undefined, symbol: string): string {
  if (base == null || base === "") return "—";
  const n = Number(base) / 1e6;
  return Number.isFinite(n) ? formatTokenAmount(n, symbol) : "—";
}

type ReadOnlySwapCardProps = {
  quote?: SwapQuote | null;
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

/**
 * The honest swap surface: a read-only quote with a permanent banner and a
 * permanently disabled trade button. Used by the vault page; the chat card
 * reuses ReadOnlyQuoteBanner/SwapOffButton so the copy can never drift.
 */
export function ReadOnlySwapCard({ quote, isPending, isError, onRetry }: ReadOnlySwapCardProps) {
  if (isPending) {
    return (
      <div
        className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5"
        aria-busy="true"
        aria-label="Loading swap quote"
      >
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-10 rounded-xl bg-[var(--p-border)]/60" />
          <div className="flex flex-wrap gap-6">
            <div className="h-14 w-36 rounded-lg bg-[var(--p-border)]/60" />
            <div className="h-14 w-36 rounded-lg bg-[var(--p-border)]/60" />
          </div>
          <div className="h-9 w-60 rounded-full bg-[var(--p-border)]/60" />
        </div>
        <p className="sr-only">Loading the read-only swap quote…</p>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <ReadOnlyQuoteBanner />
        <p className="mt-3 text-sm text-[var(--p-muted)]">
          The quote could not be loaded right now. Nothing was traded — Beacon never trades.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full bg-[var(--p-accent)] px-4 py-1.5 text-sm font-medium text-[#062116]"
          >
            Retry quote
          </button>
        ) : null}
        <SwapOffButton />
      </div>
    );
  }

  const venueLabel =
    quote.venue === "uniswap-v3" ? "Uniswap v3" : quote.venue === "uniswap-v2" ? "Uniswap v2" : "Uniswap";
  const hasRoute = quote.status === "quoted" && quote.amountOut != null && quote.amountOut !== "0";

  return (
    <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
      <ReadOnlyQuoteBanner />
      {hasRoute ? (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--p-muted)]">You pay</p>
              <p className="font-display text-2xl text-[var(--p-fg)]">
                {baseUnitsToHuman(quote.amountIn, "USDC")}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Est. receive</p>
              <p className="font-display text-2xl text-[var(--p-accent-text)]">
                ~{baseUnitsToHuman(quote.amountOut, "EURC")}
              </p>
            </div>
          </div>
          <p className="font-mono text-[11px] text-[var(--p-muted)]">
            {venueLabel} · EURC quote{quote.indicative ? " · indicative" : ""}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--p-muted)]">
          {quote.status === "UNAVAILABLE" ? "Quotes are temporarily unavailable." : "No route right now."}
        </p>
      )}
      <p className="mt-2 text-xs text-[var(--p-muted)]">{quote.reason}</p>
      <SwapOffButton />
    </div>
  );
}
