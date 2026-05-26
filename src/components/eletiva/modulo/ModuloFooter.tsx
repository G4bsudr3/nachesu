import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { moduloHref } from "@/lib/moduleHref";

interface NavModule {
  number: number;
  title: string;
}

interface Props {
  isCompleted: boolean;
  onComplete: () => void;
  completePending: boolean;
  prevModule: NavModule | null;
  nextModule: NavModule | null;
  courseSlug: string | null;
}

export const ModuloFooter = ({
  isCompleted,
  onComplete,
  completePending,
  prevModule,
  nextModule,
  courseSlug,
}: Props) => (
  <>
    <section
      aria-label="finalizar módulo"
      className="rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8 mb-8"
    >
      <h2 className="font-display uppercase text-2xl sm:text-3xl mb-2 leading-tight">
        {isCompleted ? "esse módulo já é seu" : "fechou o módulo?"}
      </h2>
      <p className="font-body text-sm text-perestroika-bege/75 mb-5 max-w-lg">
        {isCompleted
          ? "se quiser revisar, fica à vontade. seguimos pro próximo quando der."
          : "marca como concluído quando rodar todas as pílulas. sem pressa, sem cobrança."}
      </p>
      <div className="flex flex-wrap gap-3">
        {!isCompleted && (
          <button
            type="button"
            onClick={onComplete}
            disabled={completePending}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 disabled:opacity-50 transition-transform"
          >
            <CheckCircle2 className="h-4 w-4" />
            {completePending ? "salvando..." : "marcar como concluído"}
          </button>
        )}
        {nextModule && (
          <Link
            to={moduloHref(courseSlug, nextModule.number)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-bege/40 px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:bg-perestroika-bege hover:text-perestroika-preto transition-colors"
          >
            próximo módulo <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>

    <nav aria-label="navegação entre módulos" className="flex justify-between gap-3">
      {prevModule ? (
        <Link
          to={moduloHref(courseSlug, prevModule.number)}
          className="group flex-1 max-w-[48%] rounded-2xl border border-perestroika-preto/15 p-4 hover:border-perestroika-preto transition-colors"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> módulo {String(prevModule.number).padStart(2, "0")}
          </p>
          <p className="font-body text-sm text-perestroika-preto/85 line-clamp-2">{prevModule.title}</p>
        </Link>
      ) : (
        <span className="flex-1 max-w-[48%]" />
      )}
      {nextModule ? (
        <Link
          to={moduloHref(courseSlug, nextModule.number)}
          className="group flex-1 max-w-[48%] text-right rounded-2xl border border-perestroika-preto/15 p-4 hover:border-perestroika-preto transition-colors"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1 inline-flex items-center gap-1">
            módulo {String(nextModule.number).padStart(2, "0")} <ArrowRight className="h-3 w-3" />
          </p>
          <p className="font-body text-sm text-perestroika-preto/85 line-clamp-2">{nextModule.title}</p>
        </Link>
      ) : (
        <span className="flex-1 max-w-[48%]" />
      )}
    </nav>
  </>
);
