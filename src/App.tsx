import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { HubLayout } from "@/components/layout/HubLayout";
import { ExtrasGate } from "@/components/ExtrasGate";
import { SeoRouter } from "@/components/SeoRouter";
import { useDashboardDraftPersistence } from "@/hooks/useDashboardDraftPersistence";

// rotas eager: só a landing e o 404 (rota mais provável de primeiro paint)
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RootErrorBoundary } from "@/components/system/RootErrorBoundary";

// rotas-aluno tb lazy: cada uma vira chunk separado, reduz bundle inicial
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AppDashboard = lazy(() => import("./pages/AppDashboard.tsx"));
const Pending = lazy(() => import("./pages/Pending.tsx"));

// rotas secundárias: lazy (cada página vira chunk separado)
const AccountSettings = lazy(() => import("./pages/AccountSettings.tsx"));
const Prework = lazy(() => import("./pages/Prework.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const AdminFbi = lazy(() => import("./pages/AdminFbi.tsx"));
const AdminHome = lazy(() => import("./pages/AdminHome.tsx"));
const AdminLayout = lazy(() =>
  import("./components/admin/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminAula = lazy(() => import("./pages/AdminAula.tsx"));
const AdminEletivaModulo2 = lazy(() => import("./pages/AdminEletivaModulo2.tsx"));
const AdminEletivaModulo3 = lazy(() => import("./pages/AdminEletivaModulo3.tsx"));
const AdminEletivaModulo4 = lazy(() => import("./pages/AdminEletivaModulo4.tsx"));
const AdminEletivaModulo5 = lazy(() => import("./pages/AdminEletivaModulo5.tsx"));
const AdminEletivaModulo6 = lazy(() => import("./pages/AdminEletivaModulo6.tsx"));
const PublicForm = lazy(() => import("./pages/PublicForm.tsx"));
const MinhaCarta = lazy(() => import("./pages/legacy/MinhaCarta.tsx"));
const CartaPublica = lazy(() => import("./pages/legacy/CartaPublica.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Tutorial = lazy(() => import("./pages/Tutorial.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const OnboardingDialogPage = lazy(() => import("./pages/OnboardingDialogPage.tsx"));
const HubIndex = lazy(() => import("./pages/HubIndex.tsx"));
const HubGallery = lazy(() => import("./pages/legacy/HubGallery.tsx"));
const HubBuilder = lazy(() => import("./pages/legacy/HubBuilder.tsx"));
const HubTurma = lazy(() => import("./pages/legacy/HubTurma.tsx"));
const HubMateriais = lazy(() => import("./pages/HubMateriais.tsx"));
const HubProjetos = lazy(() => import("./pages/legacy/HubProjetos.tsx"));
const HubProjetosRanking = lazy(() => import("./pages/legacy/HubProjetosRanking.tsx"));
const HubAlbum = lazy(() => import("./pages/legacy/HubAlbum.tsx"));
const FeedbackFinal = lazy(() => import("./pages/legacy/FeedbackFinal.tsx"));
const Certificado = lazy(() => import("./pages/legacy/Certificado.tsx"));
const AdminCertificateSandbox = lazy(() => import("./pages/AdminCertificateSandbox.tsx"));
const FutureLetter = lazy(() => import("./pages/legacy/FutureLetter.tsx"));
const TutorPage = lazy(() => import("./pages/TutorPage.tsx"));
const Modulo = lazy(() => import("./pages/Modulo.tsx"));
const Trilhas = lazy(() => import("./pages/Trilhas.tsx"));
const MinhasEletivas = lazy(() => import("./pages/MinhasEletivas.tsx"));
const Eletivas = lazy(() => import("./pages/Eletivas.tsx"));
const EletivaHome = lazy(() => import("./pages/EletivaHome.tsx"));
const Notificacoes = lazy(() => import("./pages/Notificacoes.tsx"));
const AdminRisco = lazy(() => import("./pages/AdminRisco.tsx"));
const AdminTurma = lazy(() => import("./pages/AdminTurma.tsx"));
const AdminStudentProfile = lazy(() => import("./pages/AdminStudentProfile.tsx"));
const Marco = lazy(() => import("./pages/Marco.tsx"));
const Comecar = lazy(() => import("./pages/Comecar.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
const GlobalVotingBanner = lazy(() =>
  import("./components/hub/GlobalVotingBanner").then((m) => ({ default: m.GlobalVotingBanner })),
);
// FeedbackFinalGlobalNudge removido do fluxo do aluno (resíduo da imersão Chŏra).
// GlobalVotingBanner agora vive atrás de <ExtrasGate>: só aparece quando a flag
// `eletiva_extras_enabled` estiver ligada (admin reativa quando precisar).

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
    <div className="flex flex-col items-center gap-4">
      <div className="motion-safe:animate-pulse">
        <EletivaSymbol size={72} pose="building" />
      </div>
      <p className="font-body text-xs text-perestroika-preto/55 lowercase">
        ajeitando os galhinhos...
      </p>
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
          <SeoRouter />
          <DashboardDraftPersistence />
          <Suspense fallback={null}>
            <GlobalVotingBanner />
          </Suspense>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/eletivas" element={<Eletivas />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/comecar" element={<Comecar />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/forms" element={<PublicForm />} />
              <Route path="/carta/:token" element={<CartaPublica />} />
              <Route path="/c/:token" element={<CartaPublica />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <RootErrorBoundary scope="dashboard">
                      <AppDashboard />
                    </RootErrorBoundary>
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
                    <ExtrasGate>
                      <Prework />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/missoes"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <Missions />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              {/* alias novo (eletiva): /app/entregas → mesma página, atrás da mesma gate */}
              <Route
                path="/app/entregas"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <Missions />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/eletivas"
                element={
                  <ProtectedRoute>
                    <MinhasEletivas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/eletiva/:slug"
                element={
                  <ProtectedRoute>
                    <RootErrorBoundary scope="eletiva-home">
                      <EletivaHome />
                    </RootErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/trilhas"
                element={
                  <ProtectedRoute>
                    <Trilhas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/notificacoes"
                element={
                  <ProtectedRoute>
                    <Notificacoes />
                  </ProtectedRoute>
                }
              />
              {/* nada aqui — rotas admin foram movidas pra baixo, dentro do AdminLayout */}

              <Route
                path="/app/eletiva/:slug/marco/:trail"
                element={
                  <ProtectedRoute>
                    <Marco />
                  </ProtectedRoute>
                }
              />
              {/* rota canônica: escopada por slug da eletiva */}
              <Route
                path="/app/eletiva/:slug/modulo/:number"
                element={
                  <ProtectedRoute>
                    <RootErrorBoundary scope="modulo">
                      <Modulo />
                    </RootErrorBoundary>
                  </ProtectedRoute>
                }
              />
              {/* rota legada sem slug: continua funcional, resolve via useActiveEletiva */}
              <Route
                path="/app/modulo/:number"
                element={
                  <ProtectedRoute>
                    <RootErrorBoundary scope="modulo">
                      <Modulo />
                    </RootErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/carta"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <MinhaCarta />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/tutorial"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <Tutorial />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/inicio"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <Onboarding />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/onboarding"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <OnboardingDialogPage />
                    </ExtrasGate>
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
                <Route path="/app/hub/galeria" element={<ExtrasGate><HubGallery /></ExtrasGate>} />
                <Route path="/app/hub/materiais" element={<HubMateriais />} />
                <Route path="/app/hub/projetos" element={<ExtrasGate><HubProjetos /></ExtrasGate>} />
                <Route path="/app/hub/projetos/ranking" element={<ExtrasGate><HubProjetosRanking /></ExtrasGate>} />
                <Route path="/app/hub/album" element={<ExtrasGate><HubAlbum /></ExtrasGate>} />
                <Route path="/app/hub/turma" element={<ExtrasGate><HubTurma /></ExtrasGate>} />
                <Route path="/app/hub/builder/:slug" element={<ExtrasGate><HubBuilder /></ExtrasGate>} />
                {/* tutor ia: rota canônica é /app/tutor. /app/chora-bot é alias legado
                    que redireciona pra não quebrar bookmarks antigos. */}
                <Route path="/app/tutor" element={<TutorPage />} />
                <Route path="/app/chora-bot" element={<Navigate to="/app/tutor" replace />} />
              </Route>
              <Route
                path="/app/feedback-final"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <FeedbackFinal />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/certificado"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <Certificado />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dinamica/carta-futuro"
                element={
                  <ProtectedRoute>
                    <ExtrasGate>
                      <FutureLetter />
                    </ExtrasGate>
                  </ProtectedRoute>
                }
              />
              {/* rota antiga sandbox: redireciona pra novo path (mantém compat) */}
              <Route
                path="/admin/preview/feedback-final"
                element={<Navigate to="/admin/certificate-sandbox" replace />}
              />

              {/* redirects de URLs legado antigas → novo prefixo /admin/legado/:tab */}
              {[
                "fbi",
                "prework",
                "missoes",
                "cartas",
                "artworks",
                "convidados",
                "emails",
                "feedback-d1",
                "feedback-final",
                "carta-futuro",
                "votacao-projetos",
                "chora-bot",
              ].map((tab) => (
                <Route
                  key={`legacy-${tab}`}
                  path={`/admin/${tab}`}
                  element={<Navigate to={`/admin/legado/${tab}`} replace />}
                />
              ))}

              {/* shell admin com sidebar + command palette */}
              <Route
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/risco" element={<AdminRisco />} />
                <Route path="/admin/turma/:courseId" element={<AdminTurma />} />
                <Route path="/admin/aluno/:userId" element={<AdminStudentProfile />} />
                <Route path="/admin/certificate-sandbox" element={<AdminCertificateSandbox />} />
                <Route path="/admin/aula/:n" element={<AdminAula />} />
                <Route path="/admin/eletiva/economia-circular/modulo/2" element={<AdminEletivaModulo2 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/3" element={<AdminEletivaModulo3 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/4" element={<AdminEletivaModulo4 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/5" element={<AdminEletivaModulo5 />} />
                <Route path="/admin/legado" element={<Navigate to="/admin/legado/fbi" replace />} />
                <Route path="/admin/legado/:tab" element={<AdminFbi />} />
                {/* compat: /admin/:tab continua respondendo no AdminFbi pra abas "operação" antigas */}
                <Route path="/admin/:tab" element={<AdminFbi />} />
              </Route>

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
