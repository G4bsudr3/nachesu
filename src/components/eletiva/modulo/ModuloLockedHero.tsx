import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, Lock } from "lucide-react";
import { moduloHref } from "@/lib/moduleHref";

interface Props {
  moduleNumber: number;
  prevModuleNumber: number | null;
  prevModuleTitle: string | null;
  availableFrom: string | null;
  courseSlug: string | null;
}

/**
 * tela do módulo travado. mostra dois sinais distintos:
 *  - quando libera (se admin definiu `available_from` no futuro)
 *  - o que destrava (módulo anterior precisa fechar)
 * cada estudante precisa saber se "tá travado porque eu não fiz X"
 * ou "tá travado porque ainda não chegou a hora". sem isso a sensação
 * é de produto quebrado.
 */
export const ModuloLockedHero = ({
  moduleNumber,
  prevModuleNumber,
  prevModuleTitle,
  availableFrom,
  courseSlug,
}: Props) => {
  const releasesInFuture = availableFrom && new Date(availableFrom).getTime() > Date.now();
  const releaseDate = releasesInFuture ? new Date(availableFrom!) : null;
  const msUntil = releaseDate ? releaseDate.getTime() - Date.now() : null;
  const hoursUntil = msUntil !== null ? Math.ceil(msUntil / (1000 * 60 * 60)) : null;
  const daysUntil = msUntil !== null
    ? Math.max(0, Math.ceil(msUntil / (1000 * 60 * 60 * 24)))
    : null;

  const headline = releasesInFuture
    ? "esse módulo ainda não abriu"
    : "esse módulo abre quando você fechar o anterior";

  // se falta menos de 24h, fala em horas. evita "em 0 dias" parecendo bug.
  const whenStr = hoursUntil !== null && hoursUntil <= 24
    ? hoursUntil <= 1
      ? "em menos de 1h"
      : `em ~${hoursUntil}h`
    : daysUntil !== null
      ? `em ${daysUntil} ${daysUntil === 1 ? "dia" : "dias"}`
      : "";

  const subhead = releasesInFuture
    ? `o ritmo da eletiva é semanal. esse módulo entra em ${releaseDate!.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      })}${whenStr ? ` · ${whenStr}` : ""}.`
    : prevModuleNumber
      ? `a eletiva é em escada. termina o módulo ${String(prevModuleNumber).padStart(2, "0")}${
          prevModuleTitle ? ` — "${prevModuleTitle.toLowerCase()}"` : ""
        } e esse aqui libera na hora.`
      : "preciso liberar o módulo anterior pra esse abrir.";

  return (
    <main className="container max-w-2xl pt-10 pb-20 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-perestroika-preto/8 mb-5"
        aria-hidden="true"
      >
        {releasesInFuture ? (
          <CalendarClock className="h-6 w-6 text-perestroika-preto/70" />
        ) : (
          <Lock className="h-6 w-6 text-perestroika-preto/70" />
        )}
      </div>
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-3">
        módulo {String(moduleNumber).padStart(2, "0")}
      </p>
      <h1 className="font-display uppercase text-4xl sm:text-5xl mb-3 leading-[0.95]">
        {headline}
      </h1>
      <p className="font-body text-perestroika-preto/70 mb-7 max-w-md mx-auto">
        {subhead}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {prevModuleNumber && (
          <Link
            to={moduloHref(courseSlug, prevModuleNumber)}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" /> ir pro módulo {String(prevModuleNumber).padStart(2, "0")}
          </Link>
        )}
        <Link
          to="/app/trilhas"
          className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-6 py-3 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
        >
          ver mapa completo
        </Link>
      </div>
    </main>
  );
};
