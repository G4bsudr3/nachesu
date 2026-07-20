import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import frattzAsset from "@/assets/facilitadores/frattz.png.asset.json";
import duduAsset from "@/assets/facilitadores/dudu.png.asset.json";

type FacilitadorInfo = {
  nome: string;
  foto: string;
  bio: string;
  accent: string;
};

const infoBySlug: Record<string, FacilitadorInfo> = {
  "ia-na-pratica": {
    nome: "frattz",
    foto: frattzAsset.url,
    bio: "constrói na frente da turma, com a turma decidindo o caminho.",
    accent: "#f756a6",
  },
  "economia-circular": {
    nome: "dudu",
    foto: duduAsset.url,
    bio: "ex-perestroika, ex-500 global. junta empreender com aprender.",
    accent: "#8A85BF",
  },
};

/**
 * Cards do dashboard pra estudante matriculada em 2+ eletivas.
 * Espelha a estética editorial da página /eletivas: fundo bege, faixa colorida no topo,
 * título preto em destaque, CTA pill preto. Adiciona a régua de progresso da eletiva por baixo.
 */
export const DualEletivasHero = () => {
  const { data: enrollments } = useMyEnrollments();
  const items = (enrollments ?? []).filter((e) => e.course);
  if (items.length < 2) return null;

  return (
    <section aria-label="suas duas eletivas" className="space-y-5 sm:space-y-6">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="h-px flex-1 bg-perestroika-preto/20" aria-hidden="true" />
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60 font-semibold">
          ESCOLHA SUA ELETIVA
        </p>
        <div className="h-px flex-1 bg-perestroika-preto/20" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {items.map((e, idx) => {
          const info =
            infoBySlug[e.course!.slug] ??
            ({
              nome: "seu tutor",
              foto: frattzAsset.url,
              bio: "",
              accent: idx === 0 ? "#f756a6" : "#6f77fc",
            } as FacilitadorInfo);
          return (
            <EletivaJourneyCard
              key={e.id}
              courseId={e.course_id}
              slug={e.course!.slug}
              title={e.course!.title}
              info={info}
            />
          );
        })}
      </div>
    </section>
  );
};

interface CardProps {
  courseId: string;
  slug: string;
  title: string;
  info: FacilitadorInfo;
}

const EletivaJourneyCard = ({ courseId, slug, title, info }: CardProps) => {
  const { data, isLoading } = useEletivaProgress(courseId);
  const { setSlug } = useActiveEletiva();

  const totalPublished = data?.totalPublished ?? 0;
  const totalCompleted = data?.totalCompleted ?? 0;
  const moduleToShow = data?.currentModule ?? data?.nextModule ?? null;
  const pct = totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;

  const started = totalCompleted > 0;
  const ctaLabel = !moduleToShow
    ? "REVISAR"
    : started
      ? "CONTINUAR"
      : "COMEÇAR";
  const ctaHref = `/app/eletiva/${slug}`;

  const pitch = moduleToShow
    ? `próximo passo: ${(moduleToShow.title || moduleToShow.objective || "abra a trilha").toLowerCase()}`
    : totalPublished === 0
      ? "o primeiro módulo abre em breve. você é avisada por aqui."
      : "você tá em dia. revise materiais ou aguarde o próximo abrir.";

  return (
    <article className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-7 sm:p-9 flex flex-col">
      {/* faixa colorida no topo */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: info.accent }}
        aria-hidden="true"
      />

      {/* título em destaque */}
      <h3
        className="font-display uppercase text-5xl sm:text-6xl mb-4 leading-[0.9] text-balance text-perestroika-preto"
      >
        {slug === "economia-circular" ? "ECONOMIA CIRCULAR\u00a0" : title.toLowerCase()}
      </h3>
      {isLoading ? (
        <div className="space-y-2 motion-safe:animate-pulse mb-6">
          <div className="h-3 w-3/4 bg-perestroika-preto/10 rounded" />
          <div className="h-3 w-1/2 bg-perestroika-preto/10 rounded" />
        </div>
      ) : (
        <p className="font-body text-base sm:text-lg text-perestroika-preto/80 leading-relaxed mb-6">
          {pitch}
        </p>
      )}


      {/* progresso */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2 gap-3">
          <span className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
            progresso
          </span>
          <span className="font-body text-xs tabular-nums text-perestroika-preto/75">
            {totalCompleted}/{totalPublished} · {pct}%
          </span>
        </div>
        <div
          className="w-full bg-perestroika-preto/10 h-1.5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${totalCompleted} de ${totalPublished} módulos concluídos, ${pct}%`}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.max(pct, moduleToShow ? 4 : 0)}%`,
              backgroundColor: info.accent,
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <Link
          to={ctaHref}
          onClick={() => setSlug(slug)}
          aria-label={`abrir eletiva ${title.toLowerCase()}`}
          className="inline-flex items-center gap-2 min-h-12 rounded-full text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-[1.03] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          style={{ backgroundColor: info.accent }}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
};
