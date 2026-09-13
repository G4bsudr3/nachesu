import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type TriageVerdict = "ok" | "revisar" | "atencao";

export type AiReview = {
  deliverable_id: string;
  verdict: TriageVerdict;
  summary: string;
  reasons: string[];
  suggested_score: number | null;
  created_at: string;
};

/**
 * triagem por ia das entregas: só prioriza e resume, nunca aprova sozinha.
 * o educador continua sendo quem revisa e dá o feedback final.
 */
export function useAiTriage({
  courseId,
  moduleId,
}: {
  courseId: string | null;
  moduleId: string | null;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["admin-ai-reviews"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverable_ai_reviews")
        .select("deliverable_id, verdict, summary, reasons, suggested_score, created_at");
      if (error) throw error;
      const map = new Map<string, AiReview>();
      (data ?? []).forEach((r) => {
        map.set(r.deliverable_id, {
          deliverable_id: r.deliverable_id,
          verdict: r.verdict as TriageVerdict,
          summary: r.summary ?? "",
          reasons: Array.isArray(r.reasons) ? (r.reasons as string[]) : [],
          suggested_score: r.suggested_score,
          created_at: r.created_at,
        });
      });
      return map;
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["admin-ai-triage-pending", courseId, moduleId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_triage_pending_count", {
        p_course_id: courseId,
        p_module_id: moduleId,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const run = useCallback(
    async (maxItems = 40) => {
      setRunning(true);
      let done = 0;
      const total = Math.min(maxItems, pendingQuery.data ?? 0);
      setProgress({ done: 0, total });
      try {
        while (done < total) {
          const { data, error } = await supabase.functions.invoke("triage-deliverables-batch", {
            body: { course_id: courseId, module_id: moduleId, batch_size: 5 },
          });
          if (error) throw error;
          const res = data as {
            processed?: number;
            remaining?: number;
            error?: string;
            detail?: string;
          };
          if (res.error === "ia_bloqueada") {
            toast.error("a ia parou: créditos ou permissão do workspace. avisa o time e tenta depois.");
            break;
          }
          if (res.error === "ia_limite") {
            toast.warning("muitas chamadas seguidas. pausei a triagem, tenta de novo em alguns minutos.");
            break;
          }
          const processed = Number(res.processed ?? 0);
          if (processed === 0) break;
          done += processed;
          setProgress({ done, total });
          await qc.invalidateQueries({ queryKey: ["admin-ai-reviews"] });
        }
        if (done > 0) toast.success(`${done} entrega${done === 1 ? "" : "s"} triada${done === 1 ? "" : "s"} pela ia`);
        else if (total === 0) toast.info("nenhuma entrega nova pra triar nesse recorte");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "falha na triagem");
      } finally {
        setRunning(false);
        await qc.invalidateQueries({ queryKey: ["admin-ai-reviews"] });
        await qc.invalidateQueries({ queryKey: ["admin-ai-triage-pending"] });
        setTimeout(() => setProgress(null), 2500);
      }
    },
    [courseId, moduleId, pendingQuery.data, qc],
  );

  return {
    reviews: reviewsQuery.data ?? new Map<string, AiReview>(),
    pending: pendingQuery.data ?? 0,
    isLoading: reviewsQuery.isLoading,
    running,
    progress,
    run,
  };
}
