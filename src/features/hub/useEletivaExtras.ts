import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * feature flag eletiva_extras_enabled em hub_settings.
 * controla se features sociais legadas (mural de projetos, votação,
 * álbum, carta futuro, perfil de builder ia, galeria, turma) ficam acessíveis.
 *
 * default: false. admin liga em /admin quando fizer sentido reativar pra essa turma.
 */
export function useEletivaExtras() {
  const query = useQuery({
    queryKey: ["hub_settings", "eletiva_extras_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_settings")
        .select("value")
        .eq("key", "eletiva_extras_enabled")
        .maybeSingle();
      if (error) throw error;
      return data?.value === "true";
    },
    staleTime: 60_000,
  });

  return {
    enabled: query.data ?? false,
    isLoading: query.isLoading,
  };
}
