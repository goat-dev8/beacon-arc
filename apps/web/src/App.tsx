import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { LandingPage } from "@/pages/LandingPage";
import { ProductShell } from "@/components/ProductShell";
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
    <div className="grid min-h-dvh place-items-center bg-[var(--p-bg,#0a0c0b)] text-sm text-[var(--p-muted,#9a96a8)]">
      Loading Beacon…
    </div>
  );
}

function RedirectMcpPreserveQuery() {
  const location = useLocation();
  return <Navigate to={`/flow/mcp${location.search}${location.hash}`} replace />;
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/start"
            element={
              <Suspense fallback={<RouteFallback />}>
                <GetStartedPage />
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
                <VerifyPage />
              </Suspense>
            }
          />
          <Route path="/desk-legacy" element={<Navigate to="/flow/desk" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
