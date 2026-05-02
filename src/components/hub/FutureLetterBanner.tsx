import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { useActiveFutureLetter } from "@/features/dinamica/useFutureLetter";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";

export const FutureLetterBanner = () => {
  const { session, myGroup, loading } = useActiveFutureLetter();

  if (loading || !session) return null;

  const sealed = !!myGroup?.submitted_at;

  return (
    <Link
      to="/app/dinamica/carta-futuro"
      aria-label={sealed ? "carta salva no admin" : "abrir dinâmica carta pro futuro"}
      className="group relative mb-10 block overflow-hidden rounded-3xl border border-perestroika-preto/15 p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background:
          "linear-gradient(135deg, #6f77fc 0%, #f756a6 60%, #fe7b02 100%)",
      }}
    >
      {/* textura de pontinhos pra ficar irmão visual do banner do álbum */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-perestroika-bege/95 shadow-lg transition-transform group-hover:scale-110 group-hover:-rotate-6">
            <LagrimaGradient className="h-9 w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-bege/85">
              {sealed ? "carta salva" : "dinâmica do tempo"}
            </p>
            <h2 className="font-display text-3xl uppercase leading-none text-perestroika-bege sm:text-4xl">
              carta pro futuro
            </h2>
            <p className="mt-2 max-w-md font-body text-sm text-perestroika-bege/90">
              {sealed ? (
                <>
                  salva com sucesso. ela já ficou guardada no admin 🔒
                </>
              ) : (
                <>
                  escreva com o seu grupo e salve direto no admin da imersão.
                </>
              )}
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors group-hover:bg-perestroika-bege group-hover:text-perestroika-preto sm:self-center">
          {sealed ? (
            <>
              <Lock className="h-3.5 w-3.5" /> ver minha carta
            </>
          ) : (
            <>
              abrir a carta <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </span>
      </div>
    </Link>
  );
};
