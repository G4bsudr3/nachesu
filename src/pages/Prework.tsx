import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Play, Wrench, Check, ExternalLink, LogOut, ArrowRight, Sparkles } from "lucide-react";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaStar } from "@/components/brand/EletivaStar";
import { useAuth } from "@/contexts/AuthContext";
import { usePrework, PreworkItem } from "@/features/prework/usePrework";
import { LEVEL_INTRO } from "@/features/prework/preworkContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrailBreadcrumb } from "@/components/hub/TrailBreadcrumb";
import { NextStepInline } from "@/components/hub/NextStepInline";
import { useBuilderLevel } from "@/hooks/useBuilderLevel";
import { LevelSwitcher } from "@/components/prework/LevelSwitcher";
import { WhatIsLovable } from "@/components/prework/WhatIsLovable";
import { OfficialChannels } from "@/components/prework/OfficialChannels";

const tipoConfig: Record<string, { label: string; icon: typeof Play; bg: string; fg: string }> = {
  video: { label: "vídeo", icon: Play, bg: "bg-perestroika-azul", fg: "text-perestroika-bege" },
  leitura: { label: "leitura", icon: BookOpen, bg: "bg-perestroika-rosa", fg: "text-perestroika-preto" },
  exercicio: { label: "exercício", icon: Wrench, bg: "bg-perestroika-laranja", fg: "text-perestroika-preto" },
};

const ItemCard = ({
  item,
  index,
  done,
  onToggle,
}: {
  item: PreworkItem;
  index: number;
  done: boolean;
  onToggle: () => void;
}) => {
  const cfg = tipoConfig[item.tipo] ?? tipoConfig.leitura;
  const Icon = cfg.icon;
  const longRead = (item.duracao_min ?? 0) >= 10;

  return (
    <article
      className={`card-perestroika flex flex-row items-start ${
        done ? "card-perestroika--muted" : "card-perestroika--lift"
      }`}
      style={{ animation: `fade-up 0.5s ease-out ${index * 70}ms both` }}
    >
      <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ${cfg.bg} ${cfg.fg}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">{cfg.label}</span>
          {item.duracao_min && (
            <span className="font-body text-xs text-perestroika-preto/50">
              · {item.duracao_min} min{longRead ? " · pode pausar" : ""}
            </span>
          )}
          {item.obrigatorio && (
            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide bg-perestroika-preto text-perestroika-bege">
              base da trilha
            </span>
          )}
          {item.clientSide && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide bg-perestroika-rosa/20 text-perestroika-preto border border-perestroika-rosa/40">
              <Sparkles className="h-2.5 w-2.5" />
              extra pra você
            </span>
          )}
        </div>
        <h3 className={`font-display uppercase text-2xl sm:text-3xl leading-none ${done ? "line-through opacity-60" : ""}`}>
          {item.titulo}
        </h3>
        {item.descricao && (
          <p className="mt-2 font-body text-sm text-perestroika-preto/75">{item.descricao}</p>
        )}
        {item.url && (
          item.url.startsWith("/") ? (
            <Link
              to={item.url}
              className="mt-3 inline-flex items-center gap-1 font-body text-sm uppercase tracking-wide text-perestroika-preto hover:gap-2 transition-all"
            >
              abrir
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 font-body text-sm uppercase tracking-wide text-perestroika-preto hover:gap-2 transition-all"
            >
              abrir
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "marcar como não feito" : "marcar como concluído"}
        className={`shrink-0 self-start h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${
          done
            ? "bg-perestroika-preto border-perestroika-preto text-perestroika-bege"
            : "border-perestroika-preto/30 hover:border-perestroika-preto bg-transparent"
        }`}
      >
        {done && <Check className="h-5 w-5" />}
      </button>
    </article>
  );
};

const Prework = () => {
  const { user, signOut } = useAuth();
  const { level, detected, hasOverride, loading: loadingLevel, setOverride, clearOverride } = useBuilderLevel();
  const {
    items,
    completedIds,
    loading,
    toggle,
    total,
    totalObrigatorios,
    concluidos,
    concluidosObrigatorios,
  } = usePrework(level);
  const [nickname, setNickname] = useState("");

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

  const pct = total === 0 ? 0 : Math.round((concluidos / total) * 100);
  const pctObrig = totalObrigatorios === 0 ? 0 : Math.round((concluidosObrigatorios / totalObrigatorios) * 100);

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <EletivaStar
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
          current="prework"
          progress={{
            fbi: "done",
            carta: "done",
            prework: "current",
            tutorial: "todo",
            missoes: "todo",
          }}
          level={level}
        />
      </section>

      <section className="container max-w-5xl pt-6 pb-6 relative z-10">
        <p className="font-body text-sm uppercase tracking-wide text-perestroika-preto/60">
          oi, {nickname || "..."}
        </p>
        <h1 className="mt-2 font-display uppercase display-clamp-section">pré-work</h1>
        {!loadingLevel && (
          <div className="mt-4">
            <LevelSwitcher
              current={level}
              detected={detected}
              hasOverride={hasOverride}
              onChange={setOverride}
              onReset={clearOverride}
            />
          </div>
        )}
        <p className="mt-4 max-w-xl font-body text-base sm:text-lg text-perestroika-preto/75 text-pretty">
          {LEVEL_INTRO[level]}
        </p>

        <div className="mt-8 max-w-xl">
          <div className="flex items-end justify-between mb-2">
            <span className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              {concluidos} de {total} concluídos
            </span>
            <span className="font-display text-2xl">{pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-perestroika-preto/10 rounded-full overflow-hidden">
            <div className="h-full bg-perestroika-preto transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {totalObrigatorios > 0 && (
            <p className="mt-2 font-body text-xs text-perestroika-preto/60">
              base da trilha: {concluidosObrigatorios}/{totalObrigatorios} ({pctObrig}%)
            </p>
          )}
        </div>
      </section>

      <section className="container max-w-5xl pb-6 relative z-10 max-w-3xl">
        <WhatIsLovable level={level} />
      </section>

      <section className="container max-w-5xl pb-10 relative z-10">
        {loading ? (
          <p className="font-body text-sm text-perestroika-preto/60">carregando…</p>
        ) : items.length === 0 ? (
          <p className="font-body text-sm text-perestroika-preto/60">
            você chegou cedo. logo vai ter conteúdo aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl">
            {items.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                done={completedIds.has(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="container max-w-5xl pb-10 relative z-10 max-w-3xl">
        <OfficialChannels />
      </section>

      {!loading && items.length > 0 && (totalObrigatorios > 0
        ? concluidosObrigatorios === totalObrigatorios
        : total > 0 && concluidos === total) && (
        <section className="container max-w-5xl pb-24 relative z-10 max-w-3xl">
          <NextStepInline
            href="/app/tutorial"
            label="hora do tutorial"
            helper="etapa 00 (escolher ideia) + 5 etapas pra criar seu primeiro app no lovable."
            tone="success"
          />
        </section>
      )}

      <footer className="container max-w-5xl py-10 relative z-10">
        <p className="font-body text-xs text-perestroika-preto/60 text-center">
          eletiva sebrae · escola sebrae · 1º ano EM
        </p>
      </footer>
    </div>
  );
};

export default Prework;
