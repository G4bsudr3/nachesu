import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // helper: só atualiza se o user mudou de verdade (evita re-render em TOKEN_REFRESHED ao voltar pra aba)
    const applySession = (newSession: Session | null) => {
      setSession((prev) => {
        const prevUserId = prev?.user?.id ?? null;
        const nextUserId = newSession?.user?.id ?? null;
        // mesma identidade de usuário: mantém a referência anterior pra não invalidar consumidores
        if (prevUserId === nextUserId && !!prev === !!newSession) {
          return prev;
        }
        return newSession;
      });
      setUser((prev) => {
        const prevId = prev?.id ?? null;
        const nextId = newSession?.user?.id ?? null;
        if (prevId === nextId) return prev;
        return newSession?.user ?? null;
      });
      setLoading(false);
    };

    // 1. listener PRIMEIRO (regra crítica do supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    // 2. depois recupera sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      applySession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
