import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface FeedbackAjuste {
  titulo: string;
  quantas_pessoas: number;
  evidencias: string[];
  sugestao: string;
  prioridade: "alta" | "media" | "baixa";
}

export interface FeedbackFuncionando {
  titulo: string;
  evidencias: string[];
  por_que_importa: string;
}

export interface FeedbackTensao {
  titulo: string;
  descricao: string;
}

export interface FeedbackAnalysis {
  manchete: string;
  subtitulo: string;
  temperatura: string;
  ajustes_dia2: FeedbackAjuste[];
  funcionando: FeedbackFuncionando[];
  tensoes: FeedbackTensao[];
  citacoes_marcantes: string[];
  sample_size?: number;
}

export const useFeedbackDia1Analysis = () => {
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hub_insights")
      .select("aggregates, generated_at")
      .eq("scope", "feedback-d1")
      .is("user_id", null)
      .maybeSingle();
    if (error) {
      logger.error("[feedback-d1-analysis] load:", error);
    } else if (data?.aggregates) {
      setAnalysis(data.aggregates as unknown as FeedbackAnalysis);
      setGeneratedAt(data.generated_at);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setRunning(true);
    const t = toast.loading("ia analisando os feedbacks, leva uns 20s...");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback-d1", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`análise pronta · ${data.sample_size} feedbacks`, { id: t });
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
