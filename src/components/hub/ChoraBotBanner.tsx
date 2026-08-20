import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const ChoraBotBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase
      .from("chora_bot_settings")
      .select("enabled, cutoff_at")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.enabled && new Date(data.cutoff_at).getTime() > Date.now()) {
          setShow(true);
        }
      });
  }, []);

  if (!show) return null;

  return (
    <Link
      to="/app/tutor"
      className="block w-full p-4 rounded-2xl bg-perestroika-preto text-perestroika-bege hover:bg-perestroika-preto/90 transition group"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)",
          }}
        >
          <MessageCircle className="w-5 h-5 text-perestroika-bege" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display uppercase text-lg leading-none">tutor IA tá no ar</p>
          <p className="text-sm text-perestroika-bege/70 mt-1">
            tire suas dúvidas das módulos. ajuda com prompt, código e ideia.
          </p>
        </div>
        <span className="text-perestroika-bege/60 group-hover:translate-x-1 transition">→</span>
      </div>
    </Link>
  );
};
