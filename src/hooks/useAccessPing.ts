import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * registra um acesso por dia por pessoa (sem ip, sem rastreio de navegação).
 * serve pro histórico de acesso do perfil no admin não depender da retenção
 * das sessões de autenticação.
 */
export function useAccessPing(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const key = `nachesu:access-ping:${userId}:${today}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // storage indisponível: segue e grava mesmo assim
    }

    const deviceKind = window.matchMedia("(max-width: 767px)").matches
      ? "celular"
      : "computador";

    void supabase
      .rpc("touch_access" as never, { _device_kind: deviceKind } as never)
      .then(({ error }) => {
        if (error) return;
        try {
          localStorage.setItem(key, "1");
        } catch {
          /* noop */
        }
      });
  }, [userId]);
}
