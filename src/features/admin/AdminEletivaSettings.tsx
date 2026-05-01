import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";

/**
 * settings da eletiva sebrae. controla feature flags que decidem
 * se features herdadas do chŏra ficam acessíveis pros alunos.
 */
export const AdminEletivaSettings = () => {
  const { enabled, isLoading } = useEletivaExtras();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

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
