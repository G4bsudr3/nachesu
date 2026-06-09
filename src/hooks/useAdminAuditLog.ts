import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: any;
  created_at: string;
};

export type AuditFilters = {
  actor_id?: string | null;
  actions?: string[];
  target_id?: string | null;
  since?: string | null; // iso
  limit?: number;
};

export const useAdminAuditLog = (filters: AuditFilters = {}) =>
  useQuery({
    queryKey: ["admin_audit_log", filters],
    staleTime: 15_000,
    queryFn: async (): Promise<AuditEntry[]> => {
      let q = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 200);
      if (filters.actor_id) q = q.eq("actor_id", filters.actor_id);
      if (filters.actions && filters.actions.length > 0) q = q.in("action", filters.actions);
      if (filters.target_id) q = q.eq("target_id", filters.target_id);
      if (filters.since) q = q.gte("created_at", filters.since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });

/** loga acesso de admin a um módulo (throttle de 2min server-side) */
export const logAdminModuleView = async (moduleId: string) => {
  try {
    await supabase.rpc("log_admin_module_view", { _module_id: moduleId });
  } catch {
    // silencioso: log de auditoria não pode quebrar a UX
  }
};
