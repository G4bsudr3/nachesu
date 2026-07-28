import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { moduloHref } from "@/lib/moduleHref";
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
 * Hero de eletivas do dashboard. Renderiza 1 card (largura cheia) ou 2 (grid),
 * usando o mesmo tratamento visual: faixa colorida, foto do facilitador,
 * progresso e CTA. Substitui EletivaCard + DualEletivasHero.
 */
export const EletivasHero = () => {
  const { data: enrollments } = useMyEnrollments();
  const items = (enrollments ?? []).filter((e) => e.course);
  if (items.length === 0) return null;

  const isSingle = items.length === 1;

  return (
    <section
      aria-label={isSingle ? "sua eletiva" : "suas duas eletivas"}
      className="space-y-5 sm:space-y-6"
    >
      {!isSingle && (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="h-px flex-1 bg-perestroika-preto/20" aria-hidden="true" />
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60 font-semibold">
            ESCOLHA SUA ELETIVA
          </p>
          <div className="h-px flex-1 bg-perestroika-preto/20" aria-hidden="true" />
        </div>
      )}

      <div
        className={
          isSingle
            ? "grid grid-cols-1"
            : "grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8"
        }
      >
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
              featured={isSingle}
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
  /** true quando é o único card no hero — usa layout mais generoso. */
  featured?: boolean;
}

const EletivaJourneyCard = ({ courseId, slug, title, info, featured = false }: CardProps) => {
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
  // no modo featured (1 eletiva), CTA vai direto pro módulo atual.
  // no modo grid (2 eletivas), CTA leva pra home da eletiva pra dar o overview.
  const ctaHref =
    featured && moduleToShow
      ? moduloHref(slug, moduleToShow.number)
      : `/app/eletiva/${slug}`;

  const pitch = moduleToShow
    ? `próximo passo: ${(moduleToShow.title || moduleToShow.objective || "abra a eletiva").toLowerCase()}`
    : totalPublished === 0
      ? "o primeiro módulo abre em breve. você é avisada por aqui."
      : "você tá em dia. revise materiais ou aguarde o próximo abrir.";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege flex flex-col ${
        featured ? "p-8 sm:p-12" : "p-7 sm:p-9"
      }`}
    >
      {/* faixa colorida no topo */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: info.accent }}
        aria-hidden="true"
      />

      {/* facilitador */}
      <div className="flex items-center gap-3 mb-5">
        <img
          src={info.foto}
          alt=""
          aria-hidden="true"
          className="h-10 w-10 rounded-full object-cover border-2"
          style={{ borderColor: info.accent }}
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
            quem te guia
          </p>
          <p className="font-body text-sm text-perestroika-preto/85 truncate">
            {info.nome}
          </p>
        </div>
      </div>

      {/* título em destaque */}
      <h3
        className={`font-display uppercase mb-4 leading-[0.9] text-balance text-perestroika-preto ${
          featured ? "text-5xl sm:text-7xl" : "text-5xl sm:text-6xl"
        }`}
      >
        {slug === "economia-circular" ? "ECONOMIA CIRCULAR\u00a0" : title.toLowerCase()}
      </h3>
      {isLoading ? (
        <div className="space-y-2 motion-safe:animate-pulse mb-6">
          <div className="h-3 w-3/4 bg-perestroika-preto/10 rounded" />
          <div className="h-3 w-1/2 bg-perestroika-preto/10 rounded" />
        </div>
      ) : (
        <p
          className={`font-body text-perestroika-preto/80 leading-relaxed mb-6 ${
            featured ? "text-base sm:text-lg max-w-2xl" : "text-base sm:text-lg"
          }`}
        >
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
      <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          to={ctaHref}
          onClick={() => setSlug(slug)}
          aria-label={`abrir eletiva ${title.toLowerCase()}`}
          className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-[1.03] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          style={{ backgroundColor: info.accent }}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {featured && (
          <Link
            to={`/app/eletiva/${slug}`}
            onClick={() => setSlug(slug)}
            className="inline-flex items-center justify-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto underline-offset-4 hover:underline"
          >
            ver mapa completo
          </Link>
        )}
      </div>
    </article>
  );
};
