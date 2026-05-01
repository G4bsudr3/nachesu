import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAnalyzeTurma = (onDone?: () => void) => {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const t = toast.loading("ia analisando a turma, leva uns 20s...");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-turma", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const saved = Number(data?.saved ?? 0);
      if (saved === 0) {
        throw new Error("ia rodou mas nada foi salvo, olha os logs");
      }
      toast.success(`análise salva · ${saved} pessoas`, { id: t });
      onDone?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      toast.error(msg, { id: t });
    } finally {
      setRunning(false);
    }
  };

  return { run, running };
};
