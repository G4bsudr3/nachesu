import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NudgeLevel = "medium" | "high" | "lost";

export interface NudgeTemplateRow {
  level: NudgeLevel;
  notification_title: string;
  notification_body: string;
  email_subject: string;
  email_body_md: string;
  updated_at: string;
}

export function useNudgeTemplates() {
  return useQuery({
    queryKey: ["nudge-templates"],
    queryFn: async (): Promise<NudgeTemplateRow[]> => {
      const { data, error } = await supabase
        .from("nudge_templates")
        .select("level, notification_title, notification_body, email_subject, email_body_md, updated_at")
        .order("level");
      if (error) throw error;
      return (data ?? []) as NudgeTemplateRow[];
    },
  });
}

export function useUpdateNudgeTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NudgeTemplateRow) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("nudge_templates")
        .update({
          notification_title: input.notification_title,
          notification_body: input.notification_body,
          email_subject: input.email_subject,
          email_body_md: input.email_body_md,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("level", input.level);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("template salvo");
      qc.invalidateQueries({ queryKey: ["nudge-templates"] });
    },
    onError: (e: any) => toast.error(e?.message || "erro ao salvar"),
  });
}
