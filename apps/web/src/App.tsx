import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProductShell } from "@/components/ProductShell";
import { GlobalErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { BeaconMark } from "@/components/diagrams/BeaconDiagrams";
import { wagmiConfig } from "@/lib/reown";

const GetStartedPage = lazy(() =>
  import("@/pages/GetStartedPage").then((m) => ({ default: m.GetStartedPage })),
);
const DeskPage = lazy(() =>
  import("@/pages/DeskPage").then((m) => ({ default: m.DeskPage })),
);
const FlowPage = lazy(() =>
  import("@/pages/FlowPage").then((m) => ({ default: m.FlowPage })),
);
const VaultJourneyPage = lazy(() =>
  import("@/pages/VaultJourneyPage").then((m) => ({ default: m.VaultJourneyPage })),
);
const ArcMcpPage = lazy(() =>
  import("@/pages/ArcMcpPage").then((m) => ({ default: m.ArcMcpPage })),
);
const VerifyPage = lazy(() =>
  import("@/pages/VerifyPage").then((m) => ({ default: m.VerifyPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--p-bg,#0a0c0b)] px-5">
      <div className="w-full max-w-xs">
        <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--p-accent,#39e08a)] text-[var(--p-on-accent,#06130c)]">
          <BeaconMark className="size-6 animate-pulse" />
        </div>
        <p className="mt-4 text-center text-sm text-[var(--p-muted,#9a96a8)]">
          Loading Beacon…
        </p>
        <div className="mt-4 space-y-2" aria-hidden>
          <Skeleton shimmer className="h-3 w-full rounded-full" />
          <Skeleton shimmer className="h-3 w-4/5 rounded-full" />
          <Skeleton shimmer className="h-3 w-3/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Landmark wrapper so the skip link always has a target. */
function PageLandmark({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      {children}
    </main>
  );
}

function RedirectMcpPreserveQuery() {
  const location = useLocation();
  return (
    <Navigate to={`/flow/mcp${location.search}${location.hash}`} replace />
  );
}

function AppRoutes() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <GlobalErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <PageLandmark>
                <LandingPage />
              </PageLandmark>
            }
          />
          <Route
            path="/start"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PageLandmark>
                  <GetStartedPage />
                </PageLandmark>
              </Suspense>
            }
          />
          {/* Legacy desk URL → stay inside product shell */}
          <Route path="/app" element={<Navigate to="/flow/desk" replace />} />
          <Route
            path="/flow"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProductShell />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback />}>
                  <FlowPage />
                </Suspense>
              }
            />
            <Route
              path="desk"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <DeskPage />
                </Suspense>
              }
            />
            <Route
              path="vault"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <VaultJourneyPage />
                </Suspense>
              }
            />
            <Route
              path="security"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <VaultJourneyPage />
                </Suspense>
              }
            />
            <Route
              path="mcp"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ArcMcpPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="/mcp" element={<RedirectMcpPreserveQuery />} />
          <Route
            path="/verify/:jobId"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PageLandmark>
                  <VerifyPage />
                </PageLandmark>
              </Suspense>
            }
          />
          <Route
            path="/desk-legacy"
            element={<Navigate to="/flow/desk" replace />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </GlobalErrorBoundary>
    </>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
