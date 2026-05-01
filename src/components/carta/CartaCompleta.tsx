import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { ARCHETYPE_TOKENS, SECTION_COLORS, getArchetypeView, type Archetype } from "./cartaTokens";
import { detectGender, firstNameDisplay, type Gender } from "@/lib/gender";

export interface CartaCompletaData {
  display_name: string | null;
  nickname: string | null;
  archetype: Archetype;
  emoji: string | null;
  essence_phrase: string | null;
  tagline: string | null;
  superpower_text: string | null;
  shadow_text: string | null;
  next_move_text: string | null;
  full_text: string | null;
  /** opcional: se não vier, é detectado a partir de display_name/nickname */
  gender?: Gender;
}

interface CartaCompletaProps {
  data: CartaCompletaData;
  /** quando true, esconde scroll-indicator e ocupa container, não viewport */
  embedded?: boolean;
  /** ações no rodapé (compartilhar, baixar, etc.) */
  actions?: React.ReactNode;
  /** elemento visual da carta (TarotCard) renderizado no hero, à esquerda em desktop */
  cardVisual?: React.ReactNode;
}

/**
 * carta de builder completa, layout bauhaus assimétrico.
 * grid 12 colunas em desktop, empilhado em mobile.
 * usado em /app/carta (aluno), /carta/:token (público logado) e dialog do admin.
 */
export const CartaCompleta = ({ data, embedded = false, actions, cardVisual }: CartaCompletaProps) => {
  const tokens = ARCHETYPE_TOKENS[data.archetype];
  const gender: Gender = data.gender ?? detectGender(data.display_name ?? data.nickname);
  const view = getArchetypeView(data.archetype, gender);
  const nome = data.nickname || firstNameDisplay(data.display_name).toLowerCase() || "builder";

  const archLabel = view.label;
  const splitAt = Math.ceil(archLabel.length / 2);
  const archStart = archLabel.slice(0, splitAt);
  const archEnd = archLabel.slice(splitAt);

  const sections: Array<{
    numero: string;
    titulo: string;
    conteudo: string | null;
    color: (typeof SECTION_COLORS)[number];
  }> = [
    {
      numero: "§ 01",
      titulo: "seu superpoder",
      conteudo: data.superpower_text,
      color: SECTION_COLORS[0],
    },
    {
      numero: "§ 02",
      titulo: "sua sombra",
      conteudo: data.shadow_text,
      color: SECTION_COLORS[1],
    },
    {
      numero: "§ 03",
      titulo: "próximo movimento",
      conteudo: data.next_move_text,
      color: SECTION_COLORS[2],
    },
  ];

  const heroMin = embedded ? "min-h-[60vh]" : "min-h-dvh";

  return (
    <article className="bg-perestroika-bege text-perestroika-preto font-body relative">
      <section
        className={`relative ${heroMin} px-6 lg:px-16 py-12 lg:py-20 overflow-hidden`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {cardVisual && (
            <div className="lg:col-span-5 flex justify-center lg:justify-start">
              <div className="w-full max-w-[320px] lg:max-w-none">{cardVisual}</div>
            </div>
          )}
          <div className={cardVisual ? "lg:col-span-7" : "lg:col-span-12"}>
            <p className="font-body text-base lg:text-lg mb-1">oi {nome},</p>
            <p className="font-body text-xs lg:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6 lg:mb-8">
              você é {view.artigo}
            </p>
            <h1 className="font-display uppercase leading-[0.85] tracking-tight">
              <span
                className="block"
                style={{
                  fontSize: embedded ? "clamp(3rem, 9vw, 7rem)" : "clamp(3.5rem, 11vw, 10rem)",
                }}
              >
                <span className={tokens.gradient?.text ?? view.text}>{archStart}</span>
                <span className="text-perestroika-preto">{archEnd}</span>
              </span>
            </h1>
            <p className="text-2xl lg:text-3xl mt-2">{data.emoji ?? view.emoji}</p>

            {data.essence_phrase && (
              <p
                className={`font-body italic text-lg lg:text-2xl mt-8 lg:mt-12 max-w-2xl border-l-4 ${view.border} pl-4 lg:pl-5 text-perestroika-preto/85`}
              >
                "{data.essence_phrase}"
              </p>
            )}

            {data.tagline && (
              <p className="font-body text-sm lg:text-base uppercase tracking-[0.15em] text-perestroika-preto/50 mt-6 lg:mt-8">
                {data.tagline}
              </p>
            )}
          </div>
        </div>

        {!embedded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 motion-safe:animate-bounce">
            <svg
              className="w-6 h-6 text-perestroika-preto/40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        )}
      </section>

      {sections.map((s, i) => (
        <div key={s.numero}>
          <div className="px-6 lg:px-16">
            <div className="h-px bg-perestroika-preto/10" />
          </div>
          <section className="px-6 lg:px-16 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-3">
              <div className={`text-[10px] lg:text-xs uppercase tracking-[0.25em] ${s.color.text} mb-2`}>
                {s.numero}
              </div>
              <h2 className={`font-display uppercase text-4xl lg:text-5xl leading-[0.9] ${s.color.text}`}>
                {s.titulo}
              </h2>
            </div>
            <div className="lg:col-span-8 lg:col-start-5 space-y-5">
              {s.conteudo ? (
                s.conteudo.split(/\n\n+/).map((para, idx) => (
                  <p key={idx} className="text-base lg:text-lg leading-relaxed text-perestroika-preto/90">
                    {para}
                  </p>
                ))
              ) : (
                <p className="text-sm italic text-perestroika-preto/40">sem conteúdo ainda nesta seção.</p>
              )}
            </div>
          </section>
        </div>
      ))}

      <div className="px-6 lg:px-16">
        <div className="h-px bg-perestroika-preto/10" />
      </div>
      <section className="px-6 lg:px-16 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-3">
          <div className="text-[10px] lg:text-xs uppercase tracking-[0.25em] text-perestroika-laranja mb-2">
            § 04
          </div>
          <h2 className="font-display uppercase text-4xl lg:text-5xl leading-[0.9] text-perestroika-laranja">
            a mensagem
          </h2>
        </div>
        <div className="lg:col-span-8 lg:col-start-5 space-y-5">
          {data.full_text ? (
            <div className="text-base lg:text-lg leading-relaxed text-perestroika-preto/90 whitespace-pre-wrap">
              {data.full_text}
            </div>
          ) : (
            <p className="text-sm italic text-perestroika-preto/40">mensagem ainda não escrita.</p>
          )}
        </div>
      </section>

      {actions && (
        <>
          <div className="px-6 lg:px-16">
            <div className="h-px bg-perestroika-preto/10" />
          </div>
          <footer className="px-6 lg:px-16 py-12 flex flex-wrap items-center justify-between gap-4">
            {actions}
          </footer>
        </>
      )}
    </article>
  );
};
