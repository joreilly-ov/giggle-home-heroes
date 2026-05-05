import React, { useState, lazy, Suspense, ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { VerticalProvider } from "@/contexts/VerticalContext";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index.tsx";
import RequireAuth from "@/components/RequireAuth";
import { PrivyProvider } from "@privy-io/react-auth";

// Lazy-loaded routes to reduce initial bundle size
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Setup = lazy(() => import("./pages/Setup.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const PostProject = lazy(() => import("./pages/PostProject.tsx"));
const TradePhotoAnalyzer = lazy(() => import("./pages/TradePhotoAnalyzer.tsx"));
const VideoAnalyzer = lazy(() => import("./pages/VideoAnalyzer.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const ContractorSignUp = lazy(() => import("./pages/ContractorSignUp.tsx"));
const ContractorOnboarding = lazy(() => import("./pages/ContractorOnboarding.tsx"));
const ContractorProfile = lazy(() => import("./pages/ContractorProfile.tsx"));
const AIBiddingTools = lazy(() => import("./pages/AIBiddingTools.tsx"));
const SameDayPayments = lazy(() => import("./pages/SameDayPayments.tsx"));
const HowEscrowWorks = lazy(() => import("./pages/HowEscrowWorks.tsx"));
const BrowseContractors = lazy(() => import("./pages/BrowseContractors.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));
const ConnectReturn = lazy(() => import("./pages/ConnectReturn.tsx"));
const ConnectRefresh = lazy(() => import("./pages/ConnectRefresh.tsx"));
const CslbCheck = lazy(() => import("./pages/CslbCheck.tsx"));
const Convert = lazy(() => import("./pages/Convert.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID ?? "clsnjfcnf02542j0fjyl6bw6f";

// Fallback component for lazy-loaded routes on slow networks
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

// Error boundary for graceful error handling
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.state.children;
  }
}



const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
          defaultChain: { id: 8453, name: "Base", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: ["https://mainnet.base.org"] } } },
          supportedChains: [{ id: 8453, name: "Base", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: ["https://mainnet.base.org"] } } }],
        }}
      >
        <>
          {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthProvider>
                  <VerticalProvider>
                    <Suspense fallback={<RouteLoader />}>
                      <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup" element={<RequireAuth><Setup /></RequireAuth>} />
              <Route path="/dashboard/*" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/post-project" element={<RequireAuth><PostProject /></RequireAuth>} />
              <Route path="/photo-analyzer" element={<TradePhotoAnalyzer />} />
              <Route path="/video-analyzer" element={<VideoAnalyzer />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contractor-signup" element={<ContractorSignUp />} />
              <Route path="/contractor/signup" element={<RequireAuth><ContractorOnboarding /></RequireAuth>} />
              <Route path="/contractor/profile/*" element={<RequireAuth><ContractorProfile /></RequireAuth>} />
              <Route path="/ai-bidding-tools" element={<AIBiddingTools />} />
              <Route path="/same-day-payments" element={<SameDayPayments />} />
              <Route path="/how-escrow-works" element={<HowEscrowWorks />} />
              <Route path="/browse-contractors" element={<BrowseContractors />} />
              <Route path="/install" element={<Install />} />
              <Route path="/contractor/connect/return" element={<RequireAuth><ConnectReturn /></RequireAuth>} />
              <Route path="/contractor/connect/refresh" element={<RequireAuth><ConnectRefresh /></RequireAuth>} />
              <Route path="/cslb-check" element={<CslbCheck />} />
                        {/* Hidden utility — intentionally not linked from anywhere */}
                        <Route path="/convert" element={<Convert />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </VerticalProvider>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </>
      </PrivyProvider>
    </ErrorBoundary>
  );
};

export default App;
