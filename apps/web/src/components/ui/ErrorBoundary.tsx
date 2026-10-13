import { Component, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { NETWORK } from "@/lib/chain";
import { isChunkLoadError } from "@/lib/chunkLoad";

function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const chunkLoad = isChunkLoadError(error);
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center bg-paper px-5 py-16"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-line bg-surface">
          <AlertTriangle className="size-6 text-warn" aria-hidden />
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          [ Beacon hiccup ]
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
          Something broke on our side.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          {chunkLoad
            ? "A new version of Beacon was just deployed while you had the page open. Reload to pick it up — nothing was signed or spent."
            : "This page hit an unexpected error. Your wallet state is untouched — nothing was signed or spent."}
        </p>
        <details className="mx-auto mt-4 max-w-full text-left">
          <summary className="cursor-pointer font-mono text-xs text-ink-faint hover:text-ink">
            Technical detail
          </summary>
          <p className="mt-2 break-words rounded-lg border border-line bg-paper-2 p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
            {error.message || "Unknown error"}
          </p>
        </details>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {chunkLoad ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 bg-signal px-6 font-display text-sm font-medium text-ink clip-facet-right hover:brightness-105"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reload latest
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 items-center gap-2 bg-signal px-6 font-display text-sm font-medium text-ink clip-facet-right hover:brightness-105"
            >
              <RotateCcw className="size-4" aria-hidden />
              Try again
            </button>
          )}
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-6 font-display text-sm font-medium text-ink hover:bg-paper-2"
          >
            <Home className="size-4" aria-hidden />
            Back home
          </Link>
        </div>
        <p className="mt-6 text-[13px] text-ink-faint">
          Still stuck?{" "}
          <a
            href={NETWORK.explorer}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            Check the Arc explorer ↗
          </a>{" "}
          — on-chain state is authoritative.
        </p>
      </div>
    </main>
  );
}

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

class GlobalErrorBoundaryInner extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error("[Beacon] uncaught render error:", error);
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorFallback error={this.state.error} onRetry={this.retry} />
      );
    }
    return this.props.children;
  }
}

/**
 * App-wide error boundary. Remounts (clearing the error) on every route
 * change, so navigating away from a crashed page always recovers.
 */
export function GlobalErrorBoundary({ children }: BoundaryProps) {
  const location = useLocation();
  return (
    <GlobalErrorBoundaryInner key={location.pathname}>
      {children}
    </GlobalErrorBoundaryInner>
  );
}
