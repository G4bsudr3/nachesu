import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MissionStatus = "pendente" | "aprovada" | "ajustar";

export interface Mission {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  instrucao: string | null;
  duracao_min: number | null;
}

export interface MissionSubmission {
  id: string;
  mission_id: string;
  user_id: string;
  link: string;
  descricao: string;
  status: MissionStatus;
  feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const missionSubmissionSchema = z.object({
  link: z
    .string()
    .trim()
    .min(1, "cola o link da sua entrega")
    .max(500, "link muito longo")
    .refine((v) => /^(https?:\/\/|www\.)/i.test(v), "coloca um link válido (com http ou www)"),
  descricao: z
    .string()
    .trim()
    .min(10, "conta um pouco mais (no mínimo 10 caracteres)")
    .max(1000, "passou de 1000 caracteres"),
});

export type MissionSubmissionInput = z.infer<typeof missionSubmissionSchema>;

export const useMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, MissionSubmission>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: missionsData, error: missionsErr }, { data: submissionsData }] = await Promise.all([
      supabase
        .from("missions")
        .select("*")
        .eq("published", true)
        .order("ordem", { ascending: true }),
      supabase.from("mission_submissions").select("*").eq("user_id", user.id),
    ]);

    if (missionsErr) toast.error("erro ao carregar missões");
    setMissions((missionsData ?? []) as Mission[]);
    const map: Record<string, MissionSubmission> = {};
    (submissionsData ?? []).forEach((s) => {
      map[s.mission_id] = s as MissionSubmission;
    });
    setSubmissions(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refresh();
  }, [user, refresh]);

  const submitMission = async (
    missionId: string,
    input: MissionSubmissionInput,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: "sem sessão" };
    const parsed = missionSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const existing = submissions[missionId];
    const payload = {
      mission_id: missionId,
      user_id: user.id,
      link: parsed.data.link,
      descricao: parsed.data.descricao,
      // se reenviar, volta pra pendente e limpa feedback
      ...(existing ? { status: "pendente" as MissionStatus, feedback: null, reviewed_at: null } : {}),
    };

    const { error } = existing
      ? await supabase
          .from("mission_submissions")
          .update(payload)
          .eq("id", existing.id)
      : await supabase.from("mission_submissions").insert(payload);

    if (error) {
      toast.error("não rolou enviar agora");
      return { ok: false, error: error.message };
    }
    await refresh();
    toast.success(existing ? "submissão atualizada" : "missão enviada");
    return { ok: true };
  };

  const totalAprovadas = Object.values(submissions).filter((s) => s.status === "aprovada").length;
  const totalEnviadas = Object.keys(submissions).length;

  return {
    missions,
    submissions,
    loading,
    submitMission,
    refresh,
    total: missions.length,
    totalEnviadas,
    totalAprovadas,
  };
};
