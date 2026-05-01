import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { HubLayout } from "@/components/layout/HubLayout";
import { useDashboardDraftPersistence } from "@/hooks/useDashboardDraftPersistence";

// rotas críticas: ficam eager (carregam no bundle inicial)
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import AppDashboard from "./pages/AppDashboard.tsx";
import Pending from "./pages/Pending.tsx";
import NotFound from "./pages/NotFound.tsx";

// rotas secundárias: lazy (cada página vira chunk separado)
const AccountSettings = lazy(() => import("./pages/AccountSettings.tsx"));
const Prework = lazy(() => import("./pages/Prework.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const AdminFbi = lazy(() => import("./pages/AdminFbi.tsx"));
const PublicForm = lazy(() => import("./pages/PublicForm.tsx"));
const MinhaCarta = lazy(() => import("./pages/MinhaCarta.tsx"));
const CartaPublica = lazy(() => import("./pages/CartaPublica.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Tutorial = lazy(() => import("./pages/Tutorial.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const HubIndex = lazy(() => import("./pages/HubIndex.tsx"));
const HubGallery = lazy(() => import("./pages/HubGallery.tsx"));
const HubBuilder = lazy(() => import("./pages/HubBuilder.tsx"));
const HubTurma = lazy(() => import("./pages/HubTurma.tsx"));
const HubMateriais = lazy(() => import("./pages/HubMateriais.tsx"));
const HubProjetos = lazy(() => import("./pages/HubProjetos.tsx"));
const HubProjetosRanking = lazy(() => import("./pages/HubProjetosRanking.tsx"));
const HubAlbum = lazy(() => import("./pages/HubAlbum.tsx"));
const FeedbackFinal = lazy(() => import("./pages/FeedbackFinal.tsx"));
const Certificado = lazy(() => import("./pages/Certificado.tsx"));
const AdminCertificateSandbox = lazy(() => import("./pages/AdminCertificateSandbox.tsx"));
const FutureLetter = lazy(() => import("./pages/FutureLetter.tsx"));
const ChoraBot = lazy(() => import("./pages/ChoraBot.tsx"));
const GlobalVotingBanner = lazy(() =>
  import("./components/hub/GlobalVotingBanner").then((m) => ({ default: m.GlobalVotingBanner })),
);
const FeedbackFinalGlobalNudge = lazy(() =>
  import("./components/hub/FeedbackFinalGlobalNudge").then((m) => ({
    default: m.FeedbackFinalGlobalNudge,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // não refaz fetch só por trocar de aba: evita "refresh" e perda de estado visual
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 motion-safe:animate-pulse">
      <LagrimaGradient size={56} />
      <span className="sr-only">carregando</span>
    </div>
  </div>
);

const DashboardDraftPersistence = () => {
  useDashboardDraftPersistence();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DashboardDraftPersistence />
          <Suspense fallback={null}>
            <GlobalVotingBanner />
            <FeedbackFinalGlobalNudge />
          </Suspense>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forms" element={<PublicForm />} />
              <Route path="/carta/:token" element={<CartaPublica />} />
              <Route path="/c/:token" element={<CartaPublica />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/pending"
                element={
                  <ProtectedRoute allowPending>
                    <Pending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/conta"
                element={
                  <ProtectedRoute allowPending>
                    <AccountSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/prework"
                element={
                  <ProtectedRoute>
                    <Prework />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/missoes"
                element={
                  <ProtectedRoute>
                    <Missions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/carta"
                element={
                  <ProtectedRoute>
                    <MinhaCarta />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/tutorial"
                element={
                  <ProtectedRoute>
                    <Tutorial />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/inicio"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              {/* rotas do hub: HubLayout garante MobileNav + ChoraBotFab + paddingBottom: var(--mobile-nav-h) */}
              <Route
                element={
                  <ProtectedRoute>
                    <HubLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/app/hub" element={<HubIndex />} />
                <Route path="/app/hub/galeria" element={<HubGallery />} />
                <Route path="/app/hub/materiais" element={<HubMateriais />} />
                <Route path="/app/hub/projetos" element={<HubProjetos />} />
                <Route path="/app/hub/projetos/ranking" element={<HubProjetosRanking />} />
                <Route path="/app/hub/album" element={<HubAlbum />} />
                <Route path="/app/hub/turma" element={<HubTurma />} />
                <Route path="/app/hub/builder/:slug" element={<HubBuilder />} />
                <Route path="/app/chora-bot" element={<ChoraBot />} />
              </Route>
              <Route
                path="/app/feedback-final"
                element={
                  <ProtectedRoute>
                    <FeedbackFinal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/certificado"
                element={
                  <ProtectedRoute>
                    <Certificado />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dinamica/carta-futuro"
                element={
                  <ProtectedRoute>
                    <FutureLetter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/certificate-sandbox"
                element={
                  <AdminRoute>
                    <AdminCertificateSandbox />
                  </AdminRoute>
                }
              />
              {/* rota antiga: redireciona pra sandbox novo */}
              <Route
                path="/admin/preview/feedback-final"
                element={<Navigate to="/admin/certificate-sandbox" replace />}
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminFbi />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/:tab"
                element={
                  <AdminRoute>
                    <AdminFbi />
                  </AdminRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
