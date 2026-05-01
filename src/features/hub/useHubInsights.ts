import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ThemeCount { theme: string; count: number }
export interface CityCount { city: string; count: number }

export interface Paradoxo { titulo: string; explicacao: string }
export type ObservacaoTipo = "padrao" | "tensao" | "cluster" | "outlier";
export interface Observacao {
  tipo: ObservacaoTipo;
  titulo: string;
  insight: string;
  evidencia?: string;
}
export interface Constelacao {
  nome: string;
  count: number;
  ancoras: string[];
  une: string;
  provocacao: string;
}
export interface Energia { label: string; peso: number }
export interface Mascote {
  nome: string;
  por_que: string;
  tracos: string[];
  prompt_visual?: string;
  image_url?: string;
}

export type VotingStatus = "fechada" | "aberta" | "encerrada";

export interface HubAggregates {
  // novo schema (etnográfico)
  manchete?: string;
  subtitulo?: string;
  paradoxos?: Paradoxo[];
  observacoes?: Observacao[];
  constelacoes?: Constelacao[];
  energias?: Energia[];
  mascote_candidatos?: Mascote[];
  mascote_selected_index?: number;
  // votação coletiva do mascote
  voting_status?: VotingStatus;
  voting_opened_at?: string;
  voting_closed_at?: string;
  voting_final_tally?: number[];
  /** @deprecated mantido pra compat com análises antigas que tinham só 1 mascote */
  mascote?: Mascote;
  top_cities?: CityCount[];
  // schema antigo (fallback)
  synthesis?: string;
  top_themes?: ThemeCount[];
}
export interface MatchEntry { user_id: string; reason: string }
export interface UserInsight {
  user_id: string;
  theme_primary: string | null;
  theme_tags: string[];
  matches: MatchEntry[];
}

export const useHubInsights = () => {
  const { user } = useAuth();
  const [global, setGlobal] = useState<{ id: string; aggregates: HubAggregates; generated_at: string } | null>(null);
  const [mine, setMine] = useState<UserInsight | null>(null);
  const [byUser, setByUser] = useState<Map<string, { theme_primary: string | null; theme_tags: string[] }>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hub_insights")
      .select("id, scope, user_id, theme_primary, theme_tags, matches, aggregates, generated_at");

    const g = (data ?? []).find((r) => r.scope === "global");
    if (g?.aggregates) {
      setGlobal({
        id: (g as any).id as string,
        aggregates: g.aggregates as unknown as HubAggregates,
        generated_at: g.generated_at,
      });
    } else {
      setGlobal(null);
    }

    const map = new Map<string, { theme_primary: string | null; theme_tags: string[] }>();
    for (const r of data ?? []) {
      if (r.scope === "user" && r.user_id) {
        map.set(r.user_id, {
          theme_primary: r.theme_primary,
          theme_tags: (r.theme_tags ?? []) as string[],
        });
      }
    }
    setByUser(map);

    if (user) {
      const m = (data ?? []).find((r) => r.scope === "user" && r.user_id === user.id);
      if (m) {
        setMine({
          user_id: user.id,
          theme_primary: m.theme_primary,
          theme_tags: (m.theme_tags ?? []) as string[],
          matches: (m.matches ?? []) as unknown as MatchEntry[],
        });
      } else {
        setMine(null);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { global, mine, byUser, loading, refresh: fetchAll };
};
