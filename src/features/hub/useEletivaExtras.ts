import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";

const GLOBAL_KEY = "eletiva_extras_enabled";
const perCourseKey = (courseId: string) => `${GLOBAL_KEY}:${courseId}`;

/**
 * feature flag eletiva_extras_enabled em hub_settings.
 * controla se features sociais legadas (mural, votação, álbum, carta futuro,
 * builder, galeria, turma, feedback final, certificado, tutorial) ficam acessíveis.
 *
 * por eletiva: chave `eletiva_extras_enabled:{courseId}`.
 * fallback: chave global `eletiva_extras_enabled` (default false).
 * admin sempre passa pela gate.
 */
export function useEletivaExtras(courseId?: string | null) {
  const query = useQuery({
    queryKey: ["hub_settings", GLOBAL_KEY, courseId ?? "__global__"],
    queryFn: async () => {
      const keys = courseId ? [perCourseKey(courseId), GLOBAL_KEY] : [GLOBAL_KEY];
      const { data, error } = await supabase
        .from("hub_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      const rows = data ?? [];
      if (courseId) {
        const per = rows.find((r) => r.key === perCourseKey(courseId));
        if (per) return per.value === "true";
      }
      const global = rows.find((r) => r.key === GLOBAL_KEY);
      return global?.value === "true";
    },
    staleTime: 60_000,
  });

  return {
    enabled: query.data ?? false,
    isLoading: query.isLoading,
  };
}

/**
 * resolve o course_id da eletiva "ativa" do aluno (matrícula única ou
 * slug selecionada no switcher). retorna null se ainda não matriculado.
 */
export function useActiveCourseId(): string | null {
  const { slug } = useActiveEletiva();
  const { data: enrollments } = useMyEnrollments();
  if (!enrollments || enrollments.length === 0) return null;
  if (enrollments.length === 1) return enrollments[0].course_id;
  const match = enrollments.find((e) => e.course?.slug === slug);
  return match?.course_id ?? enrollments[0].course_id;
}

/**
 * versão "automática" da gate: usa o course_id ativo.
 * pra rotas que não conhecem a eletiva explicitamente.
 */
export function useActiveEletivaExtras() {
  const courseId = useActiveCourseId();
  return useEletivaExtras(courseId);
}
