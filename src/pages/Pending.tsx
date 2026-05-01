import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { PageHeader } from "@/components/layout/PageHeader";

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
          <LagrimaGradient size={420} rotate={-20} />
        </div>
      </div>

      <PageHeader
        showLogo
        actions={
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 min-h-11 px-2 text-sm uppercase tracking-wide hover:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
          >
            sair
            <LogOut className="w-4 h-4" />
          </button>
        }
      />

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
              se você já se inscreveu, manda um oi no whatsapp do frattz que ele libera em minutos.
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
              chamar o frattz
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
    </div>
  );
};

export default Pending;
