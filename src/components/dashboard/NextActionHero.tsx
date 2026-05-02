import { Link } from "react-router-dom";
import { ArrowRight, Award, Clock, Mail, MessageCircleHeart, Sparkles } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import type { PostEventStatus } from "@/hooks/usePostEventStatus";

interface Props {
  nickname: string;
  status: PostEventStatus;
}

interface CTA {
  label: string;
  to: string;
}

interface HeroState {
  eyebrow: string;
  title: string;
  copy: string;
  /** ação principal: o próximo passo de fato pendente */
  primary: CTA;
  /** ação secundária: porto-seguro caso o aluno não queira/não possa fazer agora */
  secondary: CTA;
  icon: React.ReactNode;
  accent: string;
  /** quando true, sinaliza visualmente que a etapa ainda não foi liberada */
  locked?: boolean;
}

const SECONDARY_HUB: CTA = { label: "explorar o hub", to: "/app/hub" };
const SECONDARY_BOT: CTA = { label: "papear com tutor IA", to: "/app/tutor" };

const buildState = (status: PostEventStatus, nickname: string): HeroState => {
  // carta pro futuro: só vira ação principal se a sessão tá aberta
  if (status.futureLetterSessionOpen && !status.futureLetterDone) {
    return {
      eyebrow: "sua próxima ação",
      title: "manda a carta pro futuro",
      copy: "ficou pendente lá no sábado. escreva com o seu grupo, sele, e a gente entrega no dia certo.",
      primary: { label: "abrir carta pro futuro", to: "/app/dinamica/carta-futuro" },
      secondary: SECONDARY_HUB,
      icon: <Mail className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #6f77fc 0%, #f756a6 60%, #fe7b02 100%)",
    };
  }

  // pesquisa final pendente
  if (!status.feedbackFinalDone) {
    // se a carta ainda nem foi liberada (sem sessão aberta) e nada foi feito, sinaliza espera
    if (!status.futureLetterSessionOpen && !status.futureLetterDone) {
      return {
        eyebrow: "sua próxima ação",
        title: "feche o ciclo da eletiva",
        copy: "leva uns 4 minutos. as suas respostas afinam as próximas turmas e liberam o certificado oficial. a carta pro futuro abre em breve, fique de olho.",
        primary: { label: "responder pesquisa final", to: "/app/feedback-final" },
        secondary: SECONDARY_HUB,
        icon: <MessageCircleHeart className="h-7 w-7" />,
        accent: "linear-gradient(135deg, #fe7b02 0%, #fd4644 50%, #f756a6 100%)",
      };
    }
    return {
      eyebrow: "sua próxima ação",
      title: "feche o ciclo da eletiva",
      copy: "leva uns 4 minutos. as suas respostas afinam as próximas turmas e liberam o certificado oficial.",
      primary: { label: "responder pesquisa final", to: "/app/feedback-final" },
      secondary: SECONDARY_HUB,
      icon: <MessageCircleHeart className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #fe7b02 0%, #fd4644 50%, #f756a6 100%)",
    };
  }

  // certificado pendente
  if (!status.certificateIssued) {
    return {
      eyebrow: "última peça",
      title: "pega seu certificado",
      copy: "certificado oficial da eletiva, alta resolução, com sua carta de builder. baixa pra postar onde for.",
      primary: { label: "baixar certificado", to: "/app/certificado" },
      secondary: SECONDARY_HUB,
      icon: <Award className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #fd4644 0%, #fe7b02 100%)",
    };
  }

  // tudo feito mas a carta pro futuro ainda não foi liberada → estado de espera
  if (!status.futureLetterSessionOpen && !status.futureLetterDone) {
    return {
      eyebrow: `oi, ${nickname || "builder"}`,
      title: "você já fez sua parte",
      copy: "pesquisa e certificado fechados. a carta pro futuro abre em breve, te aviso aqui assim que liberar. enquanto isso, o hub é seu.",
      primary: SECONDARY_HUB,
      secondary: SECONDARY_BOT,
      icon: <Clock className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #6f77fc 0%, #f756a6 100%)",
      locked: true,
    };
  }

  // ciclo 100% fechado
  return {
    eyebrow: `oi, ${nickname || "builder"}`,
    title: "ciclo fechado 🤙",
    copy: "tudo entregue. de hoje em diante, o hub é teu lugar pra revisitar materiais, ver projetos da turma e papear com o tutor IA.",
    primary: SECONDARY_HUB,
    secondary: SECONDARY_BOT,
    icon: <Sparkles className="h-7 w-7" />,
    accent: "linear-gradient(135deg, #f756a6 0%, #6f77fc 100%)",
  };
};

export const NextActionHero = ({ nickname, status }: Props) => {
  const state = buildState(status, nickname);

  return (
    <section
      aria-labelledby="next-action-title"
      className="relative overflow-hidden rounded-3xl border border-perestroika-preto/15 p-6 sm:p-10"
      style={{ background: state.accent }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 opacity-25"
      >
        <EletivaSymbol size={180} />
      </div>

      <div className="relative flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-perestroika-bege/95 text-perestroika-preto shadow-lg">
            {state.icon}
          </div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-bege/90">
            {state.eyebrow}
          </p>
          {state.locked && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-perestroika-preto/30 px-2.5 py-1 font-body text-[10px] uppercase tracking-wide text-perestroika-bege">
              em breve
            </span>
          )}
        </div>

        <h1
          id="next-action-title"
          className="font-display uppercase text-5xl leading-[0.9] text-perestroika-bege text-balance sm:text-7xl"
        >
          {state.title}
        </h1>

        <p className="max-w-xl font-body text-base text-perestroika-bege/95 sm:text-lg text-pretty">
          {state.copy}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={state.primary.to}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide text-perestroika-bege transition-transform hover:scale-105 active:scale-95 sm:text-base"
          >
            {state.primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={state.secondary.to}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-bege/60 px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors hover:bg-perestroika-bege/15 sm:text-sm"
          >
            {state.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
};
