import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { BuilderLevel } from "@/lib/builderLevel";
import { EXTRA_ITEMS, OVERRIDES_BY_LEVEL } from "./preworkContent";

export interface PreworkItem {
  id: string;
  ordem: number;
  tipo: "video" | "leitura" | "exercicio" | string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  duracao_min: number | null;
  obrigatorio: boolean;
  /** marcado quando o item vem injetado do front (não existe no banco). */
  clientSide?: boolean;
}

const EXTRA_PROGRESS_KEY = (uid: string) => `chora:prework-extra:${uid}`;

const readExtraProgress = (uid: string): Set<string> => {
  try {
    const raw = localStorage.getItem(EXTRA_PROGRESS_KEY(uid));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
};

const writeExtraProgress = (uid: string, ids: Set<string>) => {
  try {
    localStorage.setItem(EXTRA_PROGRESS_KEY(uid), JSON.stringify(Array.from(ids)));
  } catch { /* ignore */ }
};

export const usePrework = (level: BuilderLevel = "novato") => {
  const { user } = useAuth();
  const [coreItems, setCoreItems] = useState<PreworkItem[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [{ data: itemsData, error: itemsErr }, { data: progressData }] = await Promise.all([
        supabase
          .from("prework_items")
          .select("*")
          .eq("published", true)
          .order("ordem", { ascending: true }),
        supabase.from("prework_progress").select("item_id").eq("user_id", user.id),
      ]);

      if (cancelled) return;
      if (itemsErr) {
        toast({ title: "erro ao carregar pré-work", description: itemsErr.message, variant: "destructive" });
      }
      setCoreItems((itemsData ?? []) as PreworkItem[]);
      const dbDone = new Set((progressData ?? []).map((p) => p.item_id));
      const extraDone = readExtraProgress(user.id);
      setCompletedIds(new Set([...dbDone, ...extraDone]));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  /** itens finais: core + overrides por nível + extras injetados na posição certa. */
  const items = useMemo<PreworkItem[]>(() => {
    // aplica overrides nos core
    const enriched: PreworkItem[] = coreItems.map((it) => {
      const override = OVERRIDES_BY_LEVEL[it.ordem]?.[level];
      if (!override) return it;
      return {
        ...it,
        descricao: override.descricao ?? it.descricao,
        url: override.url ?? it.url,
        duracao_min: override.duracao_min ?? it.duracao_min,
      };
    });

    // injeta extras antes do item core com `insertAtOrdem` correspondente
    const extrasForLevel = EXTRA_ITEMS.filter((e) => e.forLevels.includes(level));
    const result: PreworkItem[] = [];
    for (const core of enriched) {
      // injeta todos os extras que pedem pra entrar antes deste core
      const before = extrasForLevel.filter((e) => e.insertAtOrdem === core.ordem);
      for (const ex of before) {
        result.push({
          id: ex.id,
          ordem: core.ordem - 0.5, // só pra ordenação visual; não persiste
          tipo: ex.data.tipo,
          titulo: ex.data.titulo,
          descricao: ex.data.descricao ?? null,
          url: ex.data.url ?? null,
          duracao_min: ex.data.duracao_min ?? null,
          obrigatorio: Boolean(ex.data.obrigatorio),
          clientSide: true,
        });
      }
      result.push(core);
    }
    return result;
  }, [coreItems, level]);

  const toggle = useCallback(
    async (itemId: string) => {
      if (!user) return;
      const wasComplete = completedIds.has(itemId);
      const isExtra = itemId.startsWith("extra:");

      // otimista
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasComplete) next.delete(itemId);
        else next.add(itemId);
        return next;
      });

      if (isExtra) {
        // persiste em localStorage, sem ir ao banco
        const stored = readExtraProgress(user.id);
        if (wasComplete) stored.delete(itemId);
        else stored.add(itemId);
        writeExtraProgress(user.id, stored);
        return;
      }

      const { error } = wasComplete
        ? await supabase.from("prework_progress").delete().eq("user_id", user.id).eq("item_id", itemId)
        : await supabase.from("prework_progress").insert({ user_id: user.id, item_id: itemId });

      if (error) {
        // rollback
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (wasComplete) next.add(itemId);
          else next.delete(itemId);
          return next;
        });
        toast({ title: "não rolou salvar", description: error.message, variant: "destructive" });
      }
    },
    [user, completedIds],
  );

  const total = items.length;
  const totalObrigatorios = items.filter((i) => i.obrigatorio).length;
  const concluidos = items.filter((i) => completedIds.has(i.id)).length;
  const concluidosObrigatorios = items.filter((i) => i.obrigatorio && completedIds.has(i.id)).length;
  const tudoObrigatorioCompleto = totalObrigatorios > 0 && concluidosObrigatorios === totalObrigatorios;

  return {
    items,
    completedIds,
    loading,
    toggle,
    total,
    totalObrigatorios,
    concluidos,
    concluidosObrigatorios,
    tudoObrigatorioCompleto,
  };
};
