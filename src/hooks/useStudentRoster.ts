import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RosterEntry = {
  email_normalized: string;
  full_name: string;
  ra: string | null;
  turma: string | null;
  course_hint: string | null;
};

/**
 * cadastro oficial da escola (nome completo, ra, turma) indexado por e-mail.
 * usado só nas telas admin pra identificar o estudante além do apelido.
 */
export function useStudentRoster() {
  const query = useQuery({
    queryKey: ["student-roster"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_roster")
        .select("email_normalized, full_name, ra, turma, course_hint");
      if (error) throw error;
      const map = new Map<string, RosterEntry>();
      (data ?? []).forEach((r) => map.set(r.email_normalized.toLowerCase(), r as RosterEntry));
      return map;
    },
  });

  const byEmail = query.data ?? new Map<string, RosterEntry>();

  return {
    ...query,
    byEmail,
    lookup: (email?: string | null) =>
      email ? byEmail.get(email.trim().toLowerCase()) ?? null : null,
  };
}

/** nome completo quando existe no cadastro da escola, senão o apelido/código */
export function rosterLabel(
  entry: RosterEntry | null | undefined,
  fallback: string | null | undefined,
) {
  return entry?.full_name || fallback || "sem nome";
}
