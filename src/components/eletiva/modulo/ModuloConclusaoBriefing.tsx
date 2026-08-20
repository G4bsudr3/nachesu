import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateBriefingPdf } from "@/components/eletiva/pills/briefingPdf";
import type { BriefingValue } from "@/components/eletiva/pills/PillQuatroFiltrosBriefing";

interface Props {
  moduleId: string;
}

const FLUXO_LABELS: Record<string, string> = {
  materiais: "Materiais e Compras",
  alimentacao: "Alimentação",
  energia: "Energia e Clima",
  agua: "Água",
  mobilidade: "Mobilidade e Entorno",
  tecnologia: "Tecnologia e Eletrônicos",
};

/**
 * Tela de fechamento da trilha 1 (módulo 5).
 * Mostra o briefing renderizado bonito + botão de download do PDF.
 */
export function ModuloConclusaoBriefing({ moduleId }: Props) {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["conclusao-briefing", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const [{ data: deliv }, { data: prof }] = await Promise.all([
        supabase
          .from("module_deliverables")
          .select("content")
          .eq("module_id", moduleId)
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name, nickname")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      const content = (deliv?.content ?? {}) as {
        briefing_aula5?: Record<string, BriefingValue>;
      };
      const map = content.briefing_aula5 ?? {};
      const firstKey = Object.keys(map)[0];
      const briefing = firstKey ? map[firstKey] : undefined;
      const alunoNome = prof?.nickname || prof?.display_name || undefined;
      return { briefing, alunoNome };
    },
  });

  const briefing = data?.briefing;

  const downloadPdf = async () => {
    if (!briefing) return;
    const blob = await generateBriefingPdf({
      titulo: briefing.titulo,
      hmw: briefing.hmw,
      fluxo_principal: briefing.fluxo_principal,
      fluxo_secundario: briefing.fluxo_secundario,
      evidencias_resumo: briefing.evidencias_resumo,
      atores_ganha: briefing.atores_ganha,
      atores_perde: briefing.atores_perde,
      justificativa: briefing.justificativa,
      aluno_nome: data?.alunoNome,
      data_iso: briefing.gerado_em ?? new Date().toISOString(),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `briefing-${(briefing.titulo || "projeto").toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const evs = useMemo(
    () => (briefing?.evidencias_resumo ?? []).filter((e) => (e ?? "").trim().length > 0),
    [briefing],
  );

  if (!briefing) return null;

  return (
    <section
      aria-label="briefing final"
      className="mt-8 rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-5 sm:p-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5" style={{ color: "#F25E3D" }} aria-hidden />
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
          trilha 1 cumprida · seu briefing
        </p>
      </div>

      <h2 className="font-display uppercase text-3xl sm:text-5xl leading-[0.95] mb-2">
        {briefing.titulo || "(sem título)"}
      </h2>
      {data?.alunoNome && (
        <p className="font-body text-sm text-perestroika-preto/60 mb-6">por {data.alunoNome}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            1 · problema (HMW)
          </p>
          <p className="font-display text-xl leading-tight">{briefing.hmw || "—"}</p>
        </div>

        <div className="rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            2 · fluxo
          </p>
          <p className="font-body text-sm">
            <strong>{FLUXO_LABELS[briefing.fluxo_principal ?? ""] ?? briefing.fluxo_principal ?? "—"}</strong>
            {briefing.fluxo_secundario && (
              <> · <span className="text-perestroika-preto/70">{FLUXO_LABELS[briefing.fluxo_secundario] ?? briefing.fluxo_secundario}</span></>
            )}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            3 · evidências
          </p>
          {evs.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/50">—</p>
          ) : (
            <ul className="space-y-1 font-body text-sm">
              {evs.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            4 · quem ganha
          </p>
          <p className="font-body text-sm">{briefing.atores_ganha || "—"}</p>
        </div>

        <div className="rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            quem perde
          </p>
          <p className="font-body text-sm">{briefing.atores_perde || "—"}</p>
        </div>

        <div className="sm:col-span-2 rounded-2xl border-2 border-perestroika-preto/15 p-4">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            5 · por que eu
          </p>
          <p className="font-body text-sm whitespace-pre-wrap">{briefing.justificativa || "—"}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-body text-sm uppercase tracking-wide font-medium text-perestroika-bege hover:scale-105 transition-transform"
          style={{ backgroundColor: "#F25E3D" }}
        >
          <Download className="h-4 w-4" aria-hidden />
          baixar meu briefing
        </button>
        <a
          href="/app"
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-body text-sm uppercase tracking-wide font-medium border-2 border-perestroika-preto/15 hover:border-perestroika-preto text-perestroika-preto"
        >
          <FileText className="h-4 w-4" aria-hidden />
          ver minha jornada
        </a>
      </div>
    </section>
  );
}
