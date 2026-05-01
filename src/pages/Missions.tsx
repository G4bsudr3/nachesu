import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, AlertCircle, Clock, LogOut, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { EstrelaPerestroika } from "@/components/brand/EstrelaPerestroika";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMissions, type Mission, type MissionSubmission, type MissionStatus } from "@/features/missions/useMissions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TrailBreadcrumb } from "@/components/hub/TrailBreadcrumb";
import { NextStepInline } from "@/components/hub/NextStepInline";

const statusMap: Record<MissionStatus, { label: string; classes: string; icon: typeof Check }> = {
  pendente: {
    label: "em avaliação",
    classes: "bg-perestroika-azul text-perestroika-bege",
    icon: Clock,
  },
  aprovada: {
    label: "aprovada",
    classes: "bg-perestroika-preto text-perestroika-bege",
    icon: Check,
  },
  ajustar: {
    label: "precisa ajustar",
    classes: "bg-perestroika-laranja text-perestroika-preto",
    icon: AlertCircle,
  },
};

const StatusBadge = ({ status }: { status: MissionStatus }) => {
  const cfg = statusMap[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs uppercase tracking-wide ${cfg.classes}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const MissionCard = ({
  mission,
  submission,
  index,
  onSubmit,
  cardRef,
  forceOpen,
  prefillDescricao,
  showTutorialBanner,
}: {
  mission: Mission;
  submission?: MissionSubmission;
  index: number;
  onSubmit: (input: { link: string; descricao: string }) => Promise<{ ok: boolean; error?: string }>;
  cardRef?: React.RefObject<HTMLElement>;
  forceOpen?: boolean;
  prefillDescricao?: string;
  showTutorialBanner?: boolean;
}) => {
  const [open, setOpen] = useState(Boolean(forceOpen));
  const [link, setLink] = useState(submission?.link ?? "");
  const [descricao, setDescricao] = useState(submission?.descricao ?? prefillDescricao ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLink(submission?.link ?? "");
    setDescricao(submission?.descricao ?? prefillDescricao ?? "");
  }, [submission?.id, prefillDescricao]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    const res = await onSubmit({ link, descricao });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "deu erro, tenta de novo?");
      return;
    }
    setOpen(false);
  };

  const isExpanded = open || !submission;

  return (
    <article
      ref={cardRef}
      id={`m${String(mission.ordem).padStart(2, "0")}`}
      className="card-perestroika card-perestroika--lift flex flex-col scroll-mt-24"
      style={{ animation: `fade-up 0.5s ease-out ${index * 70}ms both` }}
    >
      {showTutorialBanner && (
        <div className="rounded-2xl border border-perestroika-azul/40 bg-perestroika-azul/10 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-perestroika-azul shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-perestroika-preto">
              essa é a entrega do tutorial
            </p>
            <p className="mt-1 font-body text-xs sm:text-sm text-perestroika-preto/75 text-pretty">
              faz a etapa 00 (ideia) e as 5 etapas do tutorial e cola o link aqui. é o mesmo manifesto.
            </p>
            <Link
              to="/app/tutorial"
              className="mt-2 inline-flex items-center gap-1 min-h-11 px-1 font-body text-xs uppercase tracking-wide text-perestroika-azul hover:gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-azul focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              ir pro tutorial
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-perestroika-preto/30 tabular-nums leading-none">
            {String(mission.ordem).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none">{mission.titulo}</h3>
            {mission.duracao_min && (
              <p className="mt-1 font-body text-xs text-perestroika-preto/50">{mission.duracao_min} min</p>
            )}
          </div>
        </div>
        {submission && <StatusBadge status={submission.status} />}
      </div>

      {mission.descricao && (
        <p className="font-body text-sm text-perestroika-preto/75">{mission.descricao}</p>
      )}
      {mission.instrucao && (
        <p className="font-body text-xs text-perestroika-preto/60 italic border-l-2 border-perestroika-preto/20 pl-3">
          {mission.instrucao}
        </p>
      )}

      {submission && submission.feedback && (
        <div className="rounded-2xl bg-perestroika-preto/[0.04] border border-perestroika-preto/10 p-4">
          <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-1">
            feedback do facilitador
          </p>
          <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{submission.feedback}</p>
        </div>
      )}

      {submission && !isExpanded && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <a
            href={submission.link.startsWith("http") ? submission.link : `https://${submission.link}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 min-h-11 px-1 font-body text-sm text-perestroika-preto hover:gap-2 transition-all max-w-full truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{submission.link}</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center min-h-11 px-2 font-body text-xs uppercase tracking-wide underline underline-offset-4 hover:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
          >
            reenviar
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="flex flex-col gap-3 pt-2 border-t border-perestroika-preto/10">
          <div>
            <Label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              link da entrega
            </Label>
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="mt-1 bg-white/60 border-perestroika-preto/20"
            />
          </div>
          <div>
            <Label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              o que você fez
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="conta em 2-3 frases o que você construiu, o que aprendeu, o que ficou faltando."
              rows={4}
              maxLength={1000}
              className="mt-1 bg-white/60 border-perestroika-preto/20 resize-y"
            />
            <p className="mt-1 text-right font-body text-[10px] text-perestroika-preto/40 tabular-nums">
              {descricao.length}/1000
            </p>
          </div>
          {error && <p className="font-body text-sm text-perestroika-vermelho">{error}</p>}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            {submission && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="inline-flex items-center min-h-11 px-2 font-body text-xs uppercase tracking-wide hover:opacity-60 disabled:opacity-30 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
              >
                cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {submission ? "reenviar" : "enviar entrega"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const Missions = () => {
  const { user, signOut } = useAuth();
  const { missions, submissions, loading, submitMission, total, totalEnviadas, totalAprovadas } = useMissions();
  const [nickname, setNickname] = useState("");
  const m01Ref = useRef<HTMLElement>(null);
  const [m01Anchor, setM01Anchor] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#m01") setM01Anchor(true);
  }, []);

  // scroll após carregar as missões
  useEffect(() => {
    if (!m01Anchor || loading) return;
    const t = setTimeout(() => {
      m01Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [m01Anchor, loading]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nickname, display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNickname(data?.nickname ?? data?.display_name ?? user.email?.split("@")[0] ?? "builder");
      });
  }, [user]);

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <EstrelaPerestroika
          size={360}
          color="rosa"
          className="absolute -right-32 -bottom-32 opacity-25 motion-safe:animate-spin-slow sm:!w-[480px] lg:!w-[620px]"
        />
      </div>

      <PageHeader
        back={{ to: "/app", label: "hub" }}
        actions={
          <button type="button" onClick={signOut} aria-label="sair" className="icon-btn">
            <LogOut className="h-4 w-4" />
          </button>
        }
      />

      <section className="container max-w-5xl pt-4 pb-2 relative z-10">
        <TrailBreadcrumb
          current="missoes"
          progress={{
            fbi: "done",
            carta: "done",
            prework: "done",
            tutorial: "done",
            missoes: "current",
          }}
        />
      </section>

      <section className="container max-w-5xl pt-6 pb-6 relative z-10">
        <p className="font-body text-sm uppercase tracking-wide text-perestroika-preto/60">
          oi, {nickname || "..."}
        </p>
        <h1 className="mt-2 font-display uppercase display-clamp-section">entregas</h1>
        <p className="mt-4 max-w-xl font-body text-base sm:text-lg text-perestroika-preto/75 text-pretty">
          desafios curtos para praticar prompt, pensamento de produto e iteração. envia o link, o facilitador avalia e te dá feedback.
        </p>

        {total > 0 && (
          <div className="mt-8 flex flex-wrap gap-6 font-body text-sm">
            <div>
              <span className="font-display text-3xl">{totalEnviadas}</span>
              <span className="text-perestroika-preto/60"> de {total} enviadas</span>
            </div>
            <div>
              <span className="font-display text-3xl">{totalAprovadas}</span>
              <span className="text-perestroika-preto/60"> aprovadas</span>
            </div>
          </div>
        )}
      </section>

      <section className="container max-w-5xl pb-24 relative z-10">
        {loading ? (
          <p className="font-body text-sm text-perestroika-preto/60">carregando…</p>
        ) : missions.length === 0 ? (
          <p className="font-body text-sm text-perestroika-preto/60">nenhuma entrega publicada por enquanto. volta em breve.</p>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl">
            {missions.map((m, i) => {
              const isM01 = m.ordem === 1;
              const m01Done = missions.some(
                (mm) => mm.ordem === 1 && submissions[mm.id],
              );
              const isM02 = m.ordem === 2;
              const m02HasSub = Boolean(submissions[m.id]);
              return (
                <div key={m.id} className="flex flex-col gap-4">
                  {isM02 && m01Done && !m02HasSub && (
                    <NextStepInline
                      href="#m02"
                      label="entrega 01 fechada · próxima abaixo"
                      helper="entrega 02: 10 min de warmup com prompt."
                      tone="success"
                    />
                  )}
                  <MissionCard
                    mission={m}
                    submission={submissions[m.id]}
                    index={i}
                    onSubmit={(input) => submitMission(m.id, input)}
                    cardRef={isM01 ? m01Ref : undefined}
                    forceOpen={isM01 && m01Anchor && !submissions[m.id]}
                    prefillDescricao={isM01 && m01Anchor ? "construído seguindo o tutorial chŏra" : undefined}
                    showTutorialBanner={isM01}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="container max-w-5xl py-10 relative z-10">
        <p className="font-body text-xs text-perestroika-preto/60 text-center">
          chora lovable 2026 · co-produzido por perestroika + frattz
        </p>
      </footer>
    </div>
  );
};

export default Missions;
