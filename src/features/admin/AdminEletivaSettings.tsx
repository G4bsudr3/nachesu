import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";

const SEQUENTIAL_KEY = "eletiva_sequential_unlock";

/**
 * settings da eletiva sebrae. controla feature flags que decidem
 * se features herdadas do chŏra ficam acessíveis pros alunos +
 * regra pedagógica de desbloqueio sequencial.
 */
export const AdminEletivaSettings = () => {
  const { enabled, isLoading } = useEletivaExtras();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savingSeq, setSavingSeq] = useState(false);

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

  const toggleExtras = async (next: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("hub_settings")
      .upsert(
        { key: "eletiva_extras_enabled", value: String(next), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) {
      toast.error("não rolou salvar a flag");
      return;
    }
    qc.invalidateQueries({ queryKey: ["hub_settings", "eletiva_extras_enabled"] });
    toast.success(next ? "extras liberados pra turma" : "extras escondidos");
  };

  const toggleSequential = async (next: boolean) => {
    setSavingSeq(true);
    const { error } = await supabase
      .from("hub_settings")
      .upsert(
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

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <h2 className="font-display text-3xl uppercase tracking-tight">configurações da eletiva</h2>
        <p className="text-sm text-muted-foreground">
          ligar e desligar features herdadas do chŏra lovable. admin sempre vê tudo.
        </p>
      </header>

      <section className="card-eletiva space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <Label htmlFor="sequential-toggle" className="font-display uppercase text-base">
              desbloqueio sequencial
            </Label>
            <p className="text-sm text-muted-foreground max-w-md">
              quando ligado, o aluno só vê o módulo seguinte depois de fechar o anterior. quando desligado (modo livre), todos os módulos publicados ficam abertos pra qualquer ordem.
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

      <section className="card-eletiva space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <Label htmlFor="extras-toggle" className="font-display uppercase text-base">
              features sociais (extras)
            </Label>
            <p className="text-sm text-muted-foreground max-w-md">
              mural de projetos, votação, álbum da turma, perfil de builder, galeria, carta pro futuro.
              quando desligado, alunos não veem essas rotas.
            </p>
          </div>
          <Switch
            id="extras-toggle"
            checked={enabled}
            disabled={isLoading || saving}
            onCheckedChange={toggleExtras}
          />
        </div>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          status atual: <strong>{enabled ? "liberado pros alunos" : "escondido (só admin vê)"}</strong>
        </p>
      </section>
    </div>
  );
};
