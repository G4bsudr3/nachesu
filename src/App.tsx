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
const AdminEletivaModulo7 = lazy(() => import("./pages/AdminEletivaModulo7.tsx"));
const AdminEletivaModulo8 = lazy(() => import("./pages/AdminEletivaModulo8.tsx"));
const AdminEletivaModulo9 = lazy(() => import("./pages/AdminEletivaModulo9.tsx"));
const AdminEletivaModulo10 = lazy(() => import("./pages/AdminEletivaModulo10.tsx"));
const AdminEletivaModulo11 = lazy(() => import("./pages/AdminEletivaModulo11.tsx"));
const AdminEletivaModulo12 = lazy(() => import("./pages/AdminEletivaModulo12.tsx"));
const AdminEletivaModulo13 = lazy(() => import("./pages/AdminEletivaModulo13.tsx"));
const AdminEletivaModulo14 = lazy(() => import("./pages/AdminEletivaModulo14.tsx"));
const AdminEletivaModulo15 = lazy(() => import("./pages/AdminEletivaModulo15.tsx"));
const AdminEletivaModulo16 = lazy(() => import("./pages/AdminEletivaModulo16.tsx"));
const AdminEletivaModulo17 = lazy(() => import("./pages/AdminEletivaModulo17.tsx"));
const AdminEletivaModulo18 = lazy(() => import("./pages/AdminEletivaModulo18.tsx"));
const AdminEletivaModulo19 = lazy(() => import("./pages/AdminEletivaModulo19.tsx"));
const AdminEletivaModulo20 = lazy(() => import("./pages/AdminEletivaModulo20.tsx"));
const DossieAluno = lazy(() => import("./pages/DossieAluno.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const HubIndex = lazy(() => import("./pages/HubIndex.tsx"));
const HubMateriais = lazy(() => import("./pages/HubMateriais.tsx"));



const TutorPage = lazy(() => import("./pages/TutorPage.tsx"));
const Modulo = lazy(() => import("./pages/Modulo.tsx"));
const Trilhas = lazy(() => import("./pages/Trilhas.tsx"));
const MinhasEletivas = lazy(() => import("./pages/MinhasEletivas.tsx"));
const Eletivas = lazy(() => import("./pages/Eletivas.tsx"));
const EletivaHome = lazy(() => import("./pages/EletivaHome.tsx"));
const CertificadoEletiva = lazy(() => import("./pages/CertificadoEletiva.tsx"));
const Notificacoes = lazy(() => import("./pages/Notificacoes.tsx"));
const AdminRisco = lazy(() => import("./pages/AdminRisco.tsx"));
const AdminNotificacoes = lazy(() => import("./pages/AdminNotificacoes.tsx"));
const AdminTurma = lazy(() => import("./pages/AdminTurma.tsx"));
const AdminStudentProfile = lazy(() => import("./pages/AdminStudentProfile.tsx"));
const Marco = lazy(() => import("./pages/Marco.tsx"));
const Comecar = lazy(() => import("./pages/Comecar.tsx"));
const Acompanhamento = lazy(() => import("./pages/Acompanhamento.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
const AdminEletivaModulos = lazy(() => import("./pages/AdminEletivaModulos.tsx"));
const AdminModuloDetalhe = lazy(() => import("./pages/AdminModuloDetalhe.tsx"));
const AdminAvaliacaoModulos = lazy(() => import("./pages/AdminAvaliacaoModulos.tsx"));
const AdminEntregas = lazy(() => import("./pages/AdminEntregas.tsx"));
const AdminRespostas = lazy(() => import("./pages/AdminRespostas.tsx"));
const AdminVideos = lazy(() => import("./pages/AdminVideos.tsx"));
const AdminPulso = lazy(() => import("./pages/AdminPulso.tsx"));

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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/eletivas" element={<Eletivas />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/comecar" element={<Comecar />} />
              {/* painel público da coordenação: senha própria, fora do auth do app */}
              <Route path="/acompanhamento" element={<Acompanhamento />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              {/* /forms removida junto com PublicForm (FBI legado) */}

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
              {/* rotas /app/prework, /app/missoes e /app/entregas removidas junto com páginas legadas */}
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
              {/* certificado por eletiva: liberado só com 100% de conclusão (gate na própria página) */}
              <Route
                path="/app/eletiva/:slug/certificado"
                element={
                  <ProtectedRoute>
                    <RootErrorBoundary scope="certificado-eletiva">
                      <CertificadoEletiva />
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
              {/* rota /app/carta removida junto com MinhaCarta legada */}

              {/* /app/tutorial, /app/inicio, /app/onboarding removidas junto com páginas legadas */}
              {/* rotas do hub: HubLayout garante MobileNav + ChoraBotFab + paddingBottom: var(--mobile-nav-h) */}
              <Route
                element={
                  <ProtectedRoute>
                    <HubLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/app/hub" element={<HubIndex />} />
                <Route path="/app/hub/materiais" element={<HubMateriais />} />
                {/* rotas legadas do hub (galeria, projetos, ranking, album, turma, builder) removidas */}
                {/* tutor ia: rota canônica é /app/tutor. /app/chora-bot é alias legado
                    que redireciona pra não quebrar bookmarks antigos. */}
                <Route path="/app/tutor" element={<TutorPage />} />
                <Route path="/app/chora-bot" element={<Navigate to="/app/tutor" replace />} />
              </Route>
              {/* rotas /app/feedback-final, /app/certificado e /app/dinamica/carta-futuro removidas junto com as páginas legadas */}


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
                <Route path="/admin/notificacoes" element={<AdminNotificacoes />} />
                <Route path="/admin/turma/:courseId" element={<AdminTurma />} />
                <Route path="/admin/aluno/:userId" element={<AdminStudentProfile />} />
                <Route path="/admin/aula/:n" element={<AdminAula />} />
                <Route path="/admin/eletiva/economia-circular/modulo/2" element={<AdminEletivaModulo2 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/3" element={<AdminEletivaModulo3 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/4" element={<AdminEletivaModulo4 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/5" element={<AdminEletivaModulo5 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/6" element={<AdminEletivaModulo6 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/7" element={<AdminEletivaModulo7 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/8" element={<AdminEletivaModulo8 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/9" element={<AdminEletivaModulo9 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/10" element={<AdminEletivaModulo10 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/11" element={<AdminEletivaModulo11 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/12" element={<AdminEletivaModulo12 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/13" element={<AdminEletivaModulo13 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/14" element={<AdminEletivaModulo14 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/15" element={<AdminEletivaModulo15 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/16" element={<AdminEletivaModulo16 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/17" element={<AdminEletivaModulo17 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/18" element={<AdminEletivaModulo18 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/19" element={<AdminEletivaModulo19 />} />
                <Route path="/admin/eletiva/economia-circular/modulo/20" element={<AdminEletivaModulo20 />} />
                <Route path="/dossie/:userId" element={<DossieAluno />} />
                <Route path="/admin/entregas" element={<AdminEntregas />} />
                <Route path="/admin/pulso" element={<AdminPulso />} />
                <Route path="/admin/correcoes" element={<Navigate to="/admin/entregas" replace />} />
                <Route path="/admin/respostas" element={<AdminRespostas />} />

                <Route path="/admin/eletiva/:slug/modulos" element={<AdminEletivaModulos />} />
                <Route path="/admin/eletiva/:slug/modulo/:number" element={<AdminModuloDetalhe />} />
                <Route path="/admin/eletiva/:slug/avaliacoes" element={<AdminAvaliacaoModulos />} />
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
