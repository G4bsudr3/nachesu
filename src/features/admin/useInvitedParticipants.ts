import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type InvitedUpdate = Database["public"]["Tables"]["invited_participants"]["Update"];

export type InvitedRow = Database["public"]["Tables"]["invited_participants"]["Row"];

export type InvitedWithStatus = InvitedRow & {
  has_account: boolean;
  has_fbi: boolean;
  fbi_submitted_at: string | null;
  fbi_started: boolean;
};

export type NewInvitedInput = {
  email: string;
  name: string;
  nickname?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  cidade?: string | null;
  trabalho?: string | null;
};

export const useInvitedParticipants = () => {
  const [rows, setRows] = useState<InvitedWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: invited, error } = await supabase
      .from("invited_participants")
      .select("*")
      .order("imported_at", { ascending: false })
      .limit(500);

    if (error) {
      logger.error("[admin/convidados] erro listar:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    const emails = (invited ?? []).map((r) => r.email.toLowerCase());

    // perfis com mesmo email (já criaram conta) — via fbi_responses como ponte (tem email)
    // mais simples: chega no fbi_responses pra detectar quem já tem conta (user_id not null) ou submeteu
    const { data: fbiData } = await supabase
      .from("fbi_responses")
      .select("email, user_id, submitted, submitted_at")
      .in("email", emails.length > 0 ? emails : [""]);

    const fbiByEmail = new Map<
      string,
      { has_user: boolean; submitted: boolean; submitted_at: string | null; started: boolean }
    >();
    (fbiData ?? []).forEach((f) => {
      if (!f.email) return;
      const key = f.email.toLowerCase();
      const prev =
        fbiByEmail.get(key) ?? {
          has_user: false,
          submitted: false,
          submitted_at: null as string | null,
          started: false,
        };
      const submitted = prev.submitted || !!f.submitted;
      const submitted_at =
        f.submitted && f.submitted_at
          ? prev.submitted_at && prev.submitted_at > f.submitted_at
            ? prev.submitted_at
            : f.submitted_at
          : prev.submitted_at;
      fbiByEmail.set(key, {
        has_user: prev.has_user || !!f.user_id,
        submitted,
        submitted_at,
        started: prev.started || !f.submitted, // tem registro mas não submeteu = começou
      });
    });

    const enriched: InvitedWithStatus[] = (invited ?? []).map((r) => {
      const meta = fbiByEmail.get(r.email.toLowerCase());
      return {
        ...r,
        has_account: !!meta?.has_user,
        has_fbi: !!meta?.submitted,
        fbi_submitted_at: meta?.submitted_at ?? null,
        fbi_started: !!meta?.started && !meta?.submitted,
      };
    });

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: NewInvitedInput): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      const nickname = (input.nickname?.trim() || name.split(" ")[0] || null) ?? null;

      // checa duplicado
      const { data: dup } = await supabase
        .from("invited_participants")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (dup) {
        return { ok: false, reason: "esse email já tá na lista de convidados" };
      }

      const { error } = await supabase.from("invited_participants").insert({
        email,
        name,
        nickname,
        whatsapp: input.whatsapp?.trim() || null,
        instagram: input.instagram?.trim() || null,
        cidade: input.cidade?.trim() || null,
        trabalho: input.trabalho?.trim() || null,
      });

      if (error) {
        logger.error("[admin/convidados] erro insert:", error);
        return { ok: false, reason: error.message };
      }

      await load();
      return { ok: true };
    },
    [load],
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const target = rows.find((r) => r.id === id);
      if (target?.has_fbi) {
        return { ok: false, reason: "essa pessoa já submeteu o fbi, não dá pra apagar" };
      }
      const { error } = await supabase.from("invited_participants").delete().eq("id", id);
      if (error) {
        logger.error("[admin/convidados] erro delete:", error);
        return { ok: false, reason: error.message };
      }
      await load();
      return { ok: true };
    },
    [rows, load],
  );

  const update = useCallback(
    async (
      id: string,
      patch: Partial<Omit<NewInvitedInput, "email">>,
    ): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const cleanString = (v: string | null | undefined) => {
        if (v === undefined) return undefined;
        const t = (v ?? "").trim();
        return t.length === 0 ? null : t;
      };

      const payload: InvitedUpdate = {};
      if (patch.name !== undefined) {
        const v = cleanString(patch.name);
        if (!v) return { ok: false, reason: "nome não pode ficar vazio" };
        payload.name = v;
      }
      if (patch.nickname !== undefined) payload.nickname = cleanString(patch.nickname);
      if (patch.whatsapp !== undefined) payload.whatsapp = cleanString(patch.whatsapp);
      if (patch.instagram !== undefined) payload.instagram = cleanString(patch.instagram);
      if (patch.cidade !== undefined) payload.cidade = cleanString(patch.cidade);
      if (patch.trabalho !== undefined) payload.trabalho = cleanString(patch.trabalho);

      if (Object.keys(payload).length === 0) return { ok: true };

      const { error } = await supabase
        .from("invited_participants")
        .update(payload)
        .eq("id", id);

      if (error) {
        logger.error("[admin/convidados] erro update:", error);
        return { ok: false, reason: error.message };
      }
      await load();
      return { ok: true };
    },
    [load],
  );

  return { rows, loading, reload: load, create, remove, update };
};
