import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useActiveFutureLetter, useSealFutureLetter } from "@/features/dinamica/useFutureLetter";
import { FUTURE_LETTER_ENABLED } from "@/features/dinamica/futureLetterFlag";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ProfileOption {
  user_id: string;
  display_name: string | null;
  nickname: string | null;
}

const FutureLetter = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { session, myGroup, loading, refresh } = useActiveFutureLetter();
  const { seal } = useSealFutureLetter();
  const [letter, setLetter] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("user_id, display_name, nickname")
      .eq("status", "active")
      .order("display_name", { ascending: true })
      .then(({ data }) => setProfiles((data ?? []) as ProfileOption[]));
  }, []);

  // auto-save no localStorage
  useEffect(() => {
    if (myGroup) return;
    const saved = localStorage.getItem("future_letter_draft");
    if (saved) setLetter(saved);
  }, [myGroup]);
  useEffect(() => {
    if (!myGroup) localStorage.setItem("future_letter_draft", letter);
  }, [letter, myGroup]);

  if (roleLoading || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-perestroika-bege">
        <div className="font-display uppercase text-3xl text-perestroika-preto/40 animate-pulse">
          carregando…
        </div>
      </div>
    );
  }

  if (!FUTURE_LETTER_ENABLED && !isAdmin) {
    return <Navigate to="/app/hub" replace />;
  }

  const handleSeal = async () => {
    if (!session || !user) return;
    setSubmitting(true);
    const ok = await seal({
      sessionId: session.id,
      letterText: letter,
      memberUserIds: picked,
    });
    setSubmitting(false);
    if (ok) {
      localStorage.removeItem("future_letter_draft");
      refresh();
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    if (p.user_id === user?.id) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q)
    );
  });

  const togglePick = (uid: string) => {
    setPicked((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <header className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between pt-8 pb-4">
        <ChoraLogo variant="dark" />
        <Link
          to="/app/hub"
          className="text-sm uppercase tracking-wide hover:opacity-60 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> hub
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {!session ? (
          <div className="text-center py-20">
            <p className="text-perestroika-preto/60">
              nenhuma sessão de carta aberta agora.
            </p>
          </div>
        ) : myGroup?.submitted_at ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="flex justify-center mb-6">
              <EletivaSymbol size={96} pose="resting" />
            </div>
            <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-4">
              carta salva.
            </h1>
            <p className="text-perestroika-preto/70 max-w-md mx-auto mb-2">
              vocês enviaram em{" "}
              {new Date(myGroup.submitted_at).toLocaleDateString("pt-BR")}.
            </p>
            <p className="text-perestroika-preto/70 max-w-md mx-auto">
              ela já ficou guardada no admin da imersão.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-perestroika-preto/50">
              <Lock className="w-3.5 h-3.5" /> guardada no admin
            </div>
          </motion.div>
        ) : (
          <>
            {isAdmin && !FUTURE_LETTER_ENABLED && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-perestroika-laranja/15 px-3 py-1.5 text-xs uppercase tracking-wide text-perestroika-laranja">
                <Sparkles className="w-3.5 h-3.5" />
                modo preview admin · feature flag off pro aluno
              </div>
            )}

            <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
              {session.title}
            </h1>
            <p className="text-perestroika-preto/70 mb-2">
              {session.description ?? "uma carta de vocês, guardada no admin da imersão."}
            </p>
            <p className="text-perestroika-preto/55 text-sm mb-8">
              não tem envio agendado. quando vocês salvarem, ela aparece no admin.
            </p>

            <section className="mb-8">
              <h2 className="font-display uppercase text-2xl mb-3">a carta</h2>
              <Textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="oi, gente do futuro. lembra quando…"
                className="min-h-[280px] bg-white/70 border-perestroika-preto/20 text-base leading-relaxed font-body"
              />
              <p className="text-xs text-perestroika-preto/50 mt-2">
                rascunho salva sozinho até vocês enviarem.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display uppercase text-2xl mb-3">
                quem tá no grupo
              </h2>
              <p className="text-sm text-perestroika-preto/65 mb-3">
                você já entra automaticamente. selecione os outros.
              </p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="buscar por nome ou apelido…"
                className="w-full px-4 py-2.5 mb-3 rounded-md bg-white/70 border border-perestroika-preto/20 text-sm focus:outline-none focus:ring-2 focus:ring-perestroika-laranja/40"
              />
              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1">
                {filteredProfiles.map((p) => {
                  const isPicked = picked.includes(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => togglePick(p.user_id)}
                      className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wide transition-all ${
                        isPicked
                          ? "bg-perestroika-preto text-perestroika-bege scale-105"
                          : "bg-white/60 border border-perestroika-preto/15 hover:bg-white"
                      }`}
                    >
                      {p.nickname || p.display_name || "sem nome"}
                    </button>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <p className="text-xs text-perestroika-preto/50">
                    nenhum perfil encontrado.
                  </p>
                )}
              </div>
              {picked.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge className="bg-perestroika-laranja text-perestroika-preto">
                    você
                  </Badge>
                  {picked.map((uid) => {
                    const p = profiles.find((x) => x.user_id === uid);
                    return (
                      <Badge key={uid} variant="outline" className="text-xs">
                        + {p?.nickname || p?.display_name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </section>

            <button
              type="button"
              disabled={submitting || letter.trim().length < 10}
              onClick={() => {
                if (!confirm("salvar a carta no admin?")) return;
                handleSeal();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
            >
              <Lock className="w-4 h-4" />
              {submitting ? "salvando…" : "salvar carta"}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default FutureLetter;
