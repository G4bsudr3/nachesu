import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MetricKey } from "./flowMap";

/**
 * contagens leves pra sobrepor no mapa de fluxo.
 * só leitura, tudo em tabelas/views que já existem.
 */
export const useFluxoMetrics = () =>
  useQuery({
    queryKey: ["admin-fluxo-metrics"],
    staleTime: 60_000,
    queryFn: async (): Promise<Partial<Record<MetricKey, number>>> => {
      const count = (v: { count: number | null }) => v.count ?? 0;

      const [
        pendentes,
        ativos,
        matriculas,
        risco,
        entregas,
        certificados,
        comProgresso,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("student_engagement_risk")
          .select("user_id", { count: "exact", head: true })
          .in("risk_level", ["medium", "high", "lost"]),
        supabase
          .from("module_deliverables")
          .select("id", { count: "exact", head: true })
          .eq("status", "enviado"),
        supabase.from("hub_certificates").select("id", { count: "exact", head: true }),
        supabase.from("student_module_progress").select("user_id"),
      ]);

      const distintosComProgresso = new Set(
        (comProgresso.data ?? []).map((r) => r.user_id as string),
      ).size;

      const matriculasCount = count(matriculas);

      return {
        pendentes: count(pendentes),
        ativos: count(ativos),
        matriculas: matriculasCount,
        nunca_comecaram: Math.max(0, count(ativos) - distintosComProgresso),
        parados_7d: count(risco),
        entregas_pendentes: count(entregas),
        certificados: count(certificados),
      };
    },
  });
