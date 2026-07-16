import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";

const WHATSAPP_URL = "https://wa.me/5531995384834";

const Pending = () => {
  const { user, signOut } = useAuth();
  const { status, loading } = useProfileStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && status && status !== "pending") {
      navigate("/app", { replace: true });
    }
  }, [status, loading, navigate]);

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body relative">
      {/* lágrima decorativa contida em wrapper local */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-20 -right-20 opacity-40">
          <EletivaSymbol size={420} rotate={-20} pose="peeking" />
        </div>
      </div>

      <PageHeader back={{ to: "/" }} />

      <main className="container max-w-2xl pt-12 pb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display uppercase text-7xl sm:text-8xl leading-[0.85]">
            quase
            <br />
            lá.
          </h1>

          <div className="mt-8 space-y-4 text-lg sm:text-xl text-perestroika-preto/80 max-w-xl">
            <p>seu email ainda não está na nossa lista.</p>
            <p>
              se você já se inscreveu, fala com o suporte da escola que ele libera em minutos.
            </p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              <MessageCircle className="w-4 h-4" />
              chamar o suporte
            </a>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full border-2 border-perestroika-preto/20 px-7 py-4 text-sm uppercase tracking-wide hover:border-perestroika-preto/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              sair
            </button>
          </div>

          <p className="mt-12 text-xs uppercase tracking-[0.2em] text-perestroika-preto/40">
            logado como {user.email}
          </p>
        </motion.div>
      </main>

      <footer className="container py-8 relative z-10">
        <EletivaFooter />
      </footer>
    </div>
  );
};

export default Pending;
