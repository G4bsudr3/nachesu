import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

const ACCENT: Record<string, string> = {
  "ia-na-pratica": "#f756a6",
  "economia-circular": "#8A85BF",
};

/**
 * estado de quem entrou na plataforma mas não tem matrícula.
 * em vez de virar beco sem saída, deixa a pessoa escolher a eletiva dela.
 */
export const SemMatriculaPicker = ({ className = "" }: { className?: string }) => {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, subtitle, professor_name")
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const confirm = async () => {
    if (!chosen) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("self-enroll", {
      body: { course_slug: chosen },
    });
    setSaving(false);
    const err = (data as { message?: string; error?: string } | null)?.error;
    if (error || err) {
      toast.error(
        (data as { message?: string } | null)?.message ??
          "não consegui te matricular agora. fala com o time da escola.",
      );
      return;
    }
    toast.success("matrícula feita. bora começar.");
    // invalida todo o estado derivado da matrícula/perfil, senão o aluno pode
    // continuar vendo "sem matrícula"/pending até o refetch por staleTime.
    queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["profile-status"] });
    queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
  };

  return (
    <section
      aria-label="escolher eletiva"
      className={`rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8 ${className}`}
    >
      <div className="flex items-start gap-4 mb-5">
        <EletivaSymbol size={56} pose="thinking" />
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60 mb-1">
            falta um passo
          </p>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">
            qual eletiva é a sua?
          </h2>
          <p className="font-body text-sm text-perestroika-preto/75 max-w-lg">
            você ainda não tem matrícula. escolhe a eletiva em que se inscreveu na escola e a gente
            libera seu acesso na hora.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-2xl bg-perestroika-preto/5 motion-safe:animate-pulse" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(courses ?? []).map((c) => {
            const accent = ACCENT[c.slug] ?? "#6f77fc";
            const active = chosen === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setChosen(c.slug)}
                aria-pressed={active}
                className={`relative overflow-hidden text-left rounded-2xl border-2 p-5 transition ${
                  active
                    ? "border-perestroika-preto bg-perestroika-bege"
                    : "border-perestroika-preto/15 bg-perestroika-bege/60 hover:border-perestroika-preto/40"
                }`}
              >
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                />
                <span className="block font-display uppercase text-2xl sm:text-3xl leading-[0.95] mb-1">
                  {c.title.toLowerCase()}
                </span>
                <span className="block font-body text-xs text-perestroika-preto/70">
                  com {c.professor_name.toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={!chosen || saving}
          className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-transform"
        >
          {saving ? "matriculando…" : "confirmar eletiva"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="font-body text-xs text-perestroika-preto/60">
          escolheu errado? fala com o time da escola que a gente troca.
        </p>
      </div>
    </section>
  );
};
