import { Link } from "react-router-dom";
import { Activity, ArrowRight, Calendar } from "lucide-react";
import { useStudentProgress } from "./useStudentProgress";

interface Props {
  userId: string;
}

const riskLabel = (days: number | null) => {
  if (days === null) return { text: "sem atividade ainda", tone: "muted" };
  if (days <= 3) return { text: `ativo há ${days}d`, tone: "ok" };
  if (days <= 7) return { text: `${days}d sem atividade`, tone: "warn" };
  if (days <= 14) return { text: `${days}d parado`, tone: "high" };
  return { text: `${days}d perdido`, tone: "lost" };
};

const toneClass: Record<string, string> = {
  muted: "text-perestroika-preto/45",
  ok: "text-perestroika-preto/65",
  warn: "text-perestroika-laranja",
  high: "text-[#fd4644]",
  lost: "text-[#fd4644] font-medium",
};

export const StudentProgressPanel = ({ userId }: Props) => {
  const { data, isLoading } = useStudentProgress(userId);

  if (isLoading) {
    return (
      <p className="font-body text-sm text-perestroika-preto/55">carregando progresso…</p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 p-6 text-center text-sm text-perestroika-preto/55">
        sem matrículas ativas ainda
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((c) => {
        const risk = riskLabel(c.daysSinceActivity);
        return (
          <article
            key={c.courseId}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4"
          >
            <header className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-display text-xl uppercase leading-tight">{c.courseTitle}</h3>
              {c.currentModuleNumber && (
                <Link
                  to={`/app/eletiva/${c.courseSlug}/modulo/${c.currentModuleNumber}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto whitespace-nowrap"
                >
                  módulo {String(c.currentModuleNumber).padStart(2, "0")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </header>

            <div className="mb-3">
              <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${c.percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-perestroika-preto/55">
                {c.completed} de {c.released} módulos concluídos · {c.percent}%
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-perestroika-preto/60">
                <Calendar className="w-3 h-3" />
                {c.lastActivityAt
                  ? new Date(c.lastActivityAt).toLocaleDateString("pt-BR")
                  : "–"}
              </span>
              <span className={`inline-flex items-center gap-1.5 ${toneClass[risk.tone]}`}>
                <Activity className="w-3 h-3" /> {risk.text}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
};
