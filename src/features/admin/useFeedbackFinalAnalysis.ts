import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface PontoForte {
  titulo: string;
  evidencias: string[];
  por_que_importa: string;
}

export interface ARepensar {
  titulo: string;
  quantas_pessoas: number;
  evidencias: string[];
  sugestao: string;
  prioridade: "alta" | "media" | "baixa";
}

export interface ConteudoFaltante {
  tema: string;
  evidencias: string[];
  sugestao: string;
}

export interface DetratorSay {
  citacao: string;
  diagnostico: string;
}

export interface FeedbackFinalQuanti {
  n: number;
  media_imersao: number;
  media_profs: number;
  media_melhoria_entregas: number;
  nps_score: number;
  nps_promotores: number;
  nps_passivos: number;
  nps_detratores: number;
}

export interface FeedbackFinalAnalysis {
  manchete: string;
  subtitulo: string;
  temperatura: string;
  leitura_quanti: string;
  pontos_fortes: PontoForte[];
  a_repensar: ARepensar[];
  conteudos_faltantes: ConteudoFaltante[];
  promotores_say: string[];
  detratores_say: DetratorSay[];
  citacoes_marcantes: string[];
  sample_size?: number;
  quanti?: FeedbackFinalQuanti;
}

export const useFeedbackFinalAnalysis = () => {
  const [analysis, setAnalysis] = useState<FeedbackFinalAnalysis | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hub_insights")
      .select("aggregates, generated_at")
      .eq("scope", "feedback-final")
      .is("user_id", null)
      .maybeSingle();
    if (error) {
      logger.error("[feedback-final-analysis] load:", error);
    } else if (data?.aggregates) {
      setAnalysis(data.aggregates as unknown as FeedbackFinalAnalysis);
      setGeneratedAt(data.generated_at);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setRunning(true);
    const t = toast.loading("ia analisando a pesquisa final, leva uns 30s...");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback-final", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`análise pronta · ${data.sample_size} respostas`, { id: t });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      toast.error(msg, { id: t });
    } finally {
      setRunning(false);
    }
  };

  return { analysis, generatedAt, loading, running, run };
};
