import { Link, useLocation } from "react-router-dom";
import { Compass, Home, Sparkles } from "lucide-react";
import { NETWORK } from "@/lib/chain";

/** Helpful 404: never a dead end. Direct import (not lazy) so it always loads. */
export function NotFoundPage() {
  const location = useLocation();
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center bg-paper px-5 py-16"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-line bg-surface">
          <Compass className="size-6 text-ink-faint" aria-hidden />
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          [ 404 — off the map ]
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
          This page doesn&rsquo;t exist.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Nothing was charged, nothing was signed. Here&rsquo;s where you
          probably wanted to go:
        </p>
        <p className="mx-auto mt-4 max-w-full truncate rounded-lg border border-line bg-paper-2 px-3 py-2 font-mono text-[11px] text-ink-faint">
          {location.pathname}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/flow"
            className="inline-flex h-11 items-center gap-2 bg-signal px-6 font-display text-sm font-medium text-ink clip-facet-right hover:brightness-105"
          >
            <Sparkles className="size-4" aria-hidden />
            Open Flow
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-6 font-display text-sm font-medium text-ink hover:bg-paper-2"
          >
            <Home className="size-4" aria-hidden />
            Back home
          </Link>
        </div>
        <p className="mt-6 text-[13px] text-ink-faint">
          Hunting a receipt?{" "}
          <Link to="/start" className="underline underline-offset-4 hover:text-ink">
            Get started →
          </Link>{" "}
          or browse{" "}
          <a
            href={NETWORK.explorer}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            the Arc explorer ↗
          </a>
          .
        </p>
      </div>
    </main>
  );
}
