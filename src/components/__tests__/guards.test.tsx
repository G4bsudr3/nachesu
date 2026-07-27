import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// --- mocks das dependências dos guards ---
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: vi.fn() }));
vi.mock("@/hooks/useProfileStatus", () => ({ useProfileStatus: vi.fn() }));
vi.mock("@/components/brand/EletivaSymbol", () => ({ EletivaSymbol: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

import { AdminRoute } from "@/components/AdminRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { toast } from "sonner";


const asMock = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const Guarded = () => <div>CONTEUDO PROTEGIDO</div>;

function renderAt(node: React.ReactNode, path = "/protected") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/protected" element={<>{node}</>} />
        <Route path="/auth" element={<div>PAGINA AUTH</div>} />
        <Route path="/app" element={<div>APP HOME</div>} />
        <Route path="/app/pending" element={<div>PAGINA PENDING</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminRoute", () => {
  it("mostra loading enquanto auth ou role carregam", () => {
    asMock(useAuth).mockReturnValue({ user: null, loading: true });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: true });
    renderAt(<AdminRoute><Guarded /></AdminRoute>);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("redireciona não-logado para /auth", () => {
    asMock(useAuth).mockReturnValue({ user: null, loading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    renderAt(<AdminRoute><Guarded /></AdminRoute>);
    expect(screen.getByText("PAGINA AUTH")).toBeInTheDocument();
    expect(screen.queryByText("CONTEUDO PROTEGIDO")).not.toBeInTheDocument();
  });

  it("redireciona logado SEM admin para /app", () => {
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    renderAt(<AdminRoute><Guarded /></AdminRoute>);
    expect(screen.getByText("APP HOME")).toBeInTheDocument();
    expect(screen.queryByText("CONTEUDO PROTEGIDO")).not.toBeInTheDocument();
  });

  it("libera admin", () => {
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: true, loading: false });
    renderAt(<AdminRoute><Guarded /></AdminRoute>);
    expect(screen.getByText("CONTEUDO PROTEGIDO")).toBeInTheDocument();
  });
});

describe("ProtectedRoute", () => {
  it("redireciona não-logado para /auth", () => {
    asMock(useAuth).mockReturnValue({ user: null, loading: false, signOut: vi.fn() });
    asMock(useProfileStatus).mockReturnValue({ status: null, loading: false });
    renderAt(<ProtectedRoute><Guarded /></ProtectedRoute>);
    expect(screen.getByText("PAGINA AUTH")).toBeInTheDocument();
  });

  it("faz signOut e manda pra /auth quando status = archived", () => {
    const signOut = vi.fn();
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut });
    asMock(useProfileStatus).mockReturnValue({ status: "archived", loading: false });
    renderAt(<ProtectedRoute><Guarded /></ProtectedRoute>);
    expect(screen.getByText("PAGINA AUTH")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("manda pra /app/pending quando status = pending (sem allowPending)", () => {
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut: vi.fn() });
    asMock(useProfileStatus).mockReturnValue({ status: "pending", loading: false });
    renderAt(<ProtectedRoute><Guarded /></ProtectedRoute>);
    expect(screen.getByText("PAGINA PENDING")).toBeInTheDocument();
    expect(screen.queryByText("CONTEUDO PROTEGIDO")).not.toBeInTheDocument();
  });

  it("libera pending quando allowPending = true (evita loop)", () => {
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut: vi.fn() });
    asMock(useProfileStatus).mockReturnValue({ status: "pending", loading: false });
    renderAt(<ProtectedRoute allowPending><Guarded /></ProtectedRoute>);
    expect(screen.getByText("CONTEUDO PROTEGIDO")).toBeInTheDocument();
  });

  it("libera usuário ativo", () => {
    asMock(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut: vi.fn() });
    asMock(useProfileStatus).mockReturnValue({ status: "active", loading: false });
    renderAt(<ProtectedRoute><Guarded /></ProtectedRoute>);
    expect(screen.getByText("CONTEUDO PROTEGIDO")).toBeInTheDocument();
  });
});

describe("ExtrasGate", () => {
  it("mostra loading enquanto flag/role carregam", () => {
    asMock(useActiveEletivaExtras).mockReturnValue({ enabled: false, isLoading: true });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: true });
    renderAt(<ExtrasGate><Guarded /></ExtrasGate>);
    expect(screen.getByText(/verificando acesso/i)).toBeInTheDocument();
  });

  it("admin passa mesmo com flag desligada", () => {
    asMock(useActiveEletivaExtras).mockReturnValue({ enabled: false, isLoading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: true, loading: false });
    renderAt(<ExtrasGate><Guarded /></ExtrasGate>);
    expect(screen.getByText("CONTEUDO PROTEGIDO")).toBeInTheDocument();
  });

  it("aluno com flag desligada é redirecionado para /app", () => {
    asMock(useActiveEletivaExtras).mockReturnValue({ enabled: false, isLoading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    renderAt(<ExtrasGate><Guarded /></ExtrasGate>);
    expect(screen.getByText("APP HOME")).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalled();
  });

  it("aluno com flag ligada passa", () => {
    asMock(useActiveEletivaExtras).mockReturnValue({ enabled: true, isLoading: false });
    asMock(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    renderAt(<ExtrasGate><Guarded /></ExtrasGate>);
    expect(screen.getByText("CONTEUDO PROTEGIDO")).toBeInTheDocument();
  });
});
