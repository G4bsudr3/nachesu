import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeliverableInbox } from "../usePendingDeliverables";
import { resolvePill } from "./resolvers";
import type { DeliverableContent, PillForResolve, ResolvedAnswer } from "./types";

type PillRow = {
  id: string;
  module_id: string;
  order_index: number;
  kind: PillForResolve["kind"];
  title: string;
  body_md: string | null;
  required: boolean | null;
  interaction_schema: Record<string, unknown> | null;
};

/**
 * dado um deliverable enviado pelo estudante, busca todas as pílulas daquele módulo
 * e resolve cada uma contra o content jsonb. devolve em ordem do módulo.
 *
 * essa é a fonte única de verdade do "como mostrar a entrega pro professor".
 * mudou schema de pílula? só mexer no resolver correspondente.
 */
export function useDeliverableAnswers(deliverable: DeliverableInbox | null) {
  const moduleId = deliverable?.module_id ?? null;

  const pillsQuery = useQuery({
    queryKey: ["deliverable-pills", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select(
          "id, module_id, order_index, kind, title, body_md, required, interaction_schema",
        )
        .eq("module_id", moduleId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as PillRow[];
    },
  });

  const content = (deliverable?.content ?? {}) as DeliverableContent;
  const answers: ResolvedAnswer[] = (pillsQuery.data ?? []).map((p) =>
    resolvePill(
      {
        id: p.id,
        module_id: p.module_id,
        order_index: p.order_index,
        kind: p.kind,
        title: p.title,
        body_md: p.body_md,
        required: !!p.required,
        interaction_schema: p.interaction_schema,
      },
      content,
    ),
  );

  return {
    answers,
    isLoading: pillsQuery.isLoading,
    isError: pillsQuery.isError,
  };
}
