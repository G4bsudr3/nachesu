import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAllCourses } from "@/hooks/useCourses";

const SEQUENTIAL_KEY = "eletiva_sequential_unlock";
const EXTRAS_GLOBAL_KEY = "eletiva_extras_enabled";
const extrasCourseKey = (courseId: string) => `${EXTRAS_GLOBAL_KEY}:${courseId}`;

type ExtrasRow = { key: string; value: string | null };

/**
 * settings da eletiva. controla feature flags que decidem
 * se features herdadas do chŏra ficam acessíveis pros estudantes +
 * regra pedagógica de desbloqueio sequencial.
 *
 * extras agora são por eletiva: cada curso tem seu próprio toggle.
 * a chave global `eletiva_extras_enabled` funciona como default
 * pra eletivas que ainda não tiveram seu valor definido.
 */
export const AdminEletivaSettings = () => {
  const qc = useQueryClient();
  const { data: courses = [], isLoading: coursesLoading } = useAllCourses();

  // todos os valores de extras (global + por curso) numa query só
  const { data: extrasRows = [], isLoading: extrasLoading } = useQuery({
    queryKey: ["hub_settings", "extras-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_settings")
        .select("key, value")
        .like("key", `${EXTRAS_GLOBAL_KEY}%`);
      if (error) throw error;
      return (data ?? []) as ExtrasRow[];
    },
    staleTime: 30_000,
  });

  // sequencial: default true (modo eletiva). false = modo livre.
  const { data: sequentialUnlock = true, isLoading: seqLoading } = useQuery({
    queryKey: ["hub_settings", SEQUENTIAL_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("hub_settings")
        .select("value")
        .eq("key", SEQUENTIAL_KEY)
        .maybeSingle();
      return (data?.value ?? "true").toLowerCase() !== "false";
    },
    staleTime: 60_000,
  });

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingSeq, setSavingSeq] = useState(false);

  const globalExtras =
    extrasRows.find((r) => r.key === EXTRAS_GLOBAL_KEY)?.value === "true";

  const getCourseExtras = (courseId: string): { enabled: boolean; isOverride: boolean } => {
    const row = extrasRows.find((r) => r.key === extrasCourseKey(courseId));
    if (row) return { enabled: row.value === "true", isOverride: true };
    return { enabled: globalExtras, isOverride: false };
  };

  const saveExtras = async (key: string, next: boolean, label: string) => {
    setSavingKey(key);
    const { error } = await supabase.from("hub_settings").upsert(
      { key, value: String(next), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSavingKey(null);
    if (error) {
      toast.error("não rolou salvar a flag");
      return;
    }
    qc.invalidateQueries({ queryKey: ["hub_settings", "extras-all"] });
    qc.invalidateQueries({ queryKey: ["hub_settings", EXTRAS_GLOBAL_KEY] });
    toast.success(`${label}: ${next ? "liberado" : "escondido"}`);
  };

  const resetCourseToDefault = async (courseId: string, courseLabel: string) => {
    setSavingKey(extrasCourseKey(courseId));
    const { error } = await supabase
      .from("hub_settings")
      .delete()
      .eq("key", extrasCourseKey(courseId));
    setSavingKey(null);
    if (error) {
      toast.error("não rolou voltar pro default");
      return;
    }
    qc.invalidateQueries({ queryKey: ["hub_settings", "extras-all"] });
    qc.invalidateQueries({ queryKey: ["hub_settings", EXTRAS_GLOBAL_KEY] });
    toast.success(`${courseLabel}: voltou pro default global`);
  };

  const toggleSequential = async (next: boolean) => {
    setSavingSeq(true);
    const { error } = await supabase.from("hub_settings").upsert(
      { key: SEQUENTIAL_KEY, value: String(next), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSavingSeq(false);
    if (error) {
      toast.error("não rolou salvar a flag");
      return;
    }
    qc.invalidateQueries({ queryKey: ["hub_settings", SEQUENTIAL_KEY] });
    qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
    toast.success(next ? "modo eletiva: desbloqueio em escada" : "modo livre: tudo aberto");
  };

  const loading = coursesLoading || extrasLoading;

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <h2 className="font-display text-3xl uppercase tracking-tight">configurações da eletiva</h2>
        <p className="text-sm text-muted-foreground">
          ligar e desligar features sociais legadas (mural, álbum, carta pro futuro, etc.) por eletiva. admin sempre vê tudo.
        </p>
      </header>

      <section className="card-eletiva space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <Label htmlFor="sequential-toggle" className="font-display uppercase text-base">
              desbloqueio sequencial
            </Label>
            <p className="text-sm text-muted-foreground max-w-md">
              quando ligado, o estudante só vê o módulo seguinte depois de fechar o anterior. quando desligado (modo livre), todos os módulos publicados ficam abertos pra qualquer ordem.
            </p>
          </div>
          <Switch
            id="sequential-toggle"
            checked={sequentialUnlock}
            disabled={seqLoading || savingSeq}
            onCheckedChange={toggleSequential}
          />
        </div>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          status atual: <strong>{sequentialUnlock ? "em escada (recomendado pedagogicamente)" : "modo livre"}</strong>
        </p>
      </section>

      <section className="card-eletiva space-y-6">
        <div className="space-y-1">
          <h3 className="font-display uppercase text-base">features sociais (extras) por eletiva</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            mural de projetos, votação, álbum, perfil de builder, galeria, carta pro futuro, certificado, tutorial. cada eletiva tem seu próprio toggle. eletivas sem valor definido seguem o default global abaixo.
          </p>
        </div>

        {/* default global */}
        <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="extras-global" className="font-display uppercase text-sm">
                default global
              </Label>
              <p className="text-xs text-muted-foreground">
                vale pra qualquer eletiva sem override próprio.
              </p>
            </div>
            <Switch
              id="extras-global"
              checked={globalExtras}
              disabled={loading || savingKey === EXTRAS_GLOBAL_KEY}
              onCheckedChange={(next) => saveExtras(EXTRAS_GLOBAL_KEY, next, "default global")}
            />
          </div>
        </div>

        {/* por curso */}
        <div className="space-y-3">
          {loading && (
            <p className="text-xs text-muted-foreground">carregando eletivas...</p>
          )}
          {!loading && courses.length === 0 && (
            <p className="text-xs text-muted-foreground">nenhuma eletiva cadastrada ainda.</p>
          )}
          {courses.map((c) => {
            const { enabled, isOverride } = getCourseExtras(c.id);
            const key = extrasCourseKey(c.id);
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-6 border border-border rounded-lg p-4"
              >
                <div className="space-y-1 min-w-0">
                  <Label htmlFor={`extras-${c.id}`} className="font-display uppercase text-sm truncate block">
                    {c.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isOverride ? (
                      <>
                        override ativo: <strong>{enabled ? "liberado" : "escondido"}</strong>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => resetCourseToDefault(c.id, c.title)}
                          disabled={savingKey === key}
                          className="underline hover:text-foreground transition-colors"
                        >
                          voltar pro default
                        </button>
                      </>
                    ) : (
                      <>seguindo default global: <strong>{globalExtras ? "liberado" : "escondido"}</strong></>
                    )}
                  </p>
                </div>
                <Switch
                  id={`extras-${c.id}`}
                  checked={enabled}
                  disabled={loading || savingKey === key}
                  onCheckedChange={(next) => saveExtras(key, next, c.title)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
