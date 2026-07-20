import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  History,
  Undo2,
  ChevronDown,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUrlState } from "@/hooks/useUrlState";
import { ARCHETYPE_TOKENS, type Archetype } from "@/components/carta/cartaTokens";
import { logger } from "@/lib/logger";

type Variables = {
  composition: "centered" | "off-center" | "asymmetric";
  density: "sparse" | "medium" | "dense";
  accent: "orange" | "red" | "pink" | "blue";
  rotation: "static" | "tilt" | "dynamic";
  noise: "subtle" | "medium" | "heavy";
};

type Preset = "ousado" | "clean";

type Artwork = {
  archetype: Archetype;
  image_url: string;
  generated_at: string;
  model: string | null;
  prompt_used: string | null;
};

type ArtworkVersion = {
  id: string;
  archetype: Archetype;
  image_url: string;
  prompt_used: string | null;
  model: string | null;
  generated_at: string;
  is_current: boolean;
  seed: string | null;
  variables: Variables | null;
  preset: Preset | null;
};

const ARCHETYPES: Archetype[] = [
  "visionario",
  "artesao",
  "experimentador",
  "conector",
  "pragmatico",
  "narrador",
];

const COMPOSITIONS: Variables["composition"][] = ["centered", "off-center", "asymmetric"];
const DENSITIES: Variables["density"][] = ["sparse", "medium", "dense"];
const ACCENTS: Variables["accent"][] = ["orange", "red", "pink", "blue"];
const ROTATIONS: Variables["rotation"][] = ["static", "tilt", "dynamic"];
const NOISES: Variables["noise"][] = ["subtle", "medium", "heavy"];

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type GenerateBody = {
  archetype: Archetype;
  seed?: string;
  variables?: Variables;
  preset?: Preset;
  make_current?: boolean;
};

/**
 * painel admin pros 6 artworks fixos por arquétipo.
 * cada arquétipo tem uma imagem só, gerada via nano banana pro, reaproveitada
 * em todas as cartas de builders desse arquétipo.
 */
export const AdminArtworks = () => {
  const [artworks, setArtworks] = useState<Map<Archetype, Artwork>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<Archetype | null>(null);
  const [copiedFor, setCopiedFor] = useState<Archetype | null>(null);
  const [lightboxParam, setLightboxParam] = useUrlState("lightbox", "");
  const [historyParam, setHistoryParam] = useUrlState("historico", "");
  const isArchetype = (v: string): v is Archetype =>
    (ARCHETYPES as string[]).includes(v);
  const lightboxFor: Archetype | null =
    lightboxParam && isArchetype(lightboxParam) ? lightboxParam : null;
  const historyFor: Archetype | null =
    historyParam && isArchetype(historyParam) ? historyParam : null;
  const setLightboxFor = (next: Archetype | null | ((curr: Archetype | null) => Archetype | null)) => {
    if (typeof next === "function") {
      const resolved = next(lightboxFor);
      setLightboxParam(resolved ?? "");
    } else {
      setLightboxParam(next ?? "");
    }
  };
  const [historyVersions, setHistoryVersions] = useState<ArtworkVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [customOpenFor, setCustomOpenFor] = useState<Archetype | null>(null);
  const [customVars, setCustomVars] = useState<Variables>({
    composition: "centered",
    density: "medium",
    accent: "pink",
    rotation: "static",
    noise: "medium",
  });
  const [historyFilters, setHistoryFilters] = useState<{
    composition: Variables["composition"] | null;
    density: Variables["density"] | null;
    rotation: Variables["rotation"] | null;
  }>({ composition: null, density: null, rotation: null });
  const [activateOnGenerate, setActivateOnGenerate] = useState(false);
  const [compareVersion, setCompareVersion] = useState<ArtworkVersion | null>(null);
  const [pendingByArchetype, setPendingByArchetype] = useState<Map<Archetype, number>>(new Map());
  const [syncing, setSyncing] = useState(false);

  /** força propagação das 6 artes ativas em todos os builder_cards do mesmo arquétipo,
   *  pra qualquer carta que esteja com image_url desatualizada/divergente. paranoia útil. */
  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: activeArts, error: artErr } = await supabase
        .from("archetype_artworks")
        .select("archetype, image_url");
      if (artErr) throw artErr;
      if (!activeArts || activeArts.length === 0) {
        toast.error("nenhuma arte ativa pra sincronizar");
        return;
      }

      let updated = 0;
      const now = new Date().toISOString();
      for (const art of activeArts) {
        const { data: rows, error: cardsErr } = await supabase
          .from("builder_cards")
          .update({ image_url: art.image_url, image_generated_at: now })
          .eq("archetype", art.archetype)
          .neq("image_url", art.image_url)
          .select("id");
        if (cardsErr) {
          logger.warn("[syncAll]", art.archetype, cardsErr);
          continue;
        }
        updated += rows?.length ?? 0;
      }
      if (updated === 0) {
        toast.success("tudo já estava sincronizado 🤙");
      } else {
        toast.success(`${updated} carta${updated > 1 ? "s" : ""} sincronizada${updated > 1 ? "s" : ""}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro ao sincronizar";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }, []);

  const generatedArchetypes = useMemo(
    () => ARCHETYPES.filter((a) => artworks.has(a)),
    [artworks],
  );

  const closeLightbox = useCallback(() => setLightboxFor(null), []);
  const stepLightbox = useCallback(
    (dir: 1 | -1) => {
      setLightboxFor((current) => {
        if (!current || generatedArchetypes.length === 0) return current;
        const idx = generatedArchetypes.indexOf(current);
        if (idx === -1) return generatedArchetypes[0];
        const next =
          (idx + dir + generatedArchetypes.length) % generatedArchetypes.length;
        return generatedArchetypes[next];
      });
    },
    [generatedArchetypes],
  );

  useEffect(() => {
    if (!lightboxFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") stepLightbox(1);
      else if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxFor, closeLightbox, stepLightbox]);

  const handleCopyPrompt = async (archetype: Archetype, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedFor(archetype);
      toast.success("prompt copiado");
      setTimeout(() => setCopiedFor((c) => (c === archetype ? null : c)), 1800);
    } catch {
      toast.error("não rolou copiar");
    }
  };

  const openHistory = useCallback(
    (archetype: Archetype) => {
      setHistoryParam(archetype);
    },
    [setHistoryParam],
  );

  const closeHistory = useCallback(() => {
    setHistoryParam("");
    setHistoryVersions([]);
    setHistoryFilters({ composition: null, density: null, rotation: null });
  }, [setHistoryParam]);

  // carrega versões sempre que historyFor (derivado do URL) muda pra um arquétipo válido
  useEffect(() => {
    if (!historyFor) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryVersions([]);
    setHistoryFilters({ composition: null, density: null, rotation: null });
    supabase
      .from("archetype_artwork_versions")
      .select("id, archetype, image_url, prompt_used, model, generated_at, is_current, seed, variables, preset")
      .eq("archetype", historyFor)
      .order("generated_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          logger.error("[AdminArtworks] history:", error);
          toast.error("erro ao carregar histórico");
        } else {
          setHistoryVersions((data ?? []) as unknown as ArtworkVersion[]);
        }
        setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyFor]);

  useEffect(() => {
    if (!historyFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [historyFor, closeHistory]);

  useEffect(() => {
    if (!compareVersion) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompareVersion(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compareVersion]);

  const load = useCallback(async () => {
    setLoading(true);
    const [artworksRes, versionsRes] = await Promise.all([
      supabase
        .from("archetype_artworks")
        .select("archetype, image_url, generated_at, model, prompt_used"),
      supabase
        .from("archetype_artwork_versions")
        .select("archetype, generated_at, is_current"),
    ]);
    if (artworksRes.error) {
      logger.error("[AdminArtworks] load:", artworksRes.error);
      toast.error("erro ao carregar artworks");
      setLoading(false);
      return;
    }
    const map = new Map<Archetype, Artwork>();
    (artworksRes.data ?? []).forEach((a) => map.set(a.archetype as Archetype, a as Artwork));
    setArtworks(map);

    // calcula quantas versões mais novas que a ativa existem por arquétipo
    const pending = new Map<Archetype, number>();
    if (!versionsRes.error && versionsRes.data) {
      const byArch = new Map<Archetype, { current?: string; others: string[] }>();
      versionsRes.data.forEach((v) => {
        const arch = v.archetype as Archetype;
        if (!byArch.has(arch)) byArch.set(arch, { others: [] });
        const entry = byArch.get(arch)!;
        if (v.is_current) entry.current = v.generated_at;
        else entry.others.push(v.generated_at);
      });
      byArch.forEach(({ current, others }, arch) => {
        if (!current) {
          pending.set(arch, others.length);
          return;
        }
        const count = others.filter((d) => d > current).length;
        if (count > 0) pending.set(arch, count);
      });
    }
    setPendingByArchetype(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runGenerate = async (
    archetype: Archetype,
    body: Omit<GenerateBody, "archetype" | "make_current">,
    label: string,
  ) => {
    setGeneratingFor(archetype);
    const tokens = ARCHETYPE_TOKENS[archetype];
    const willActivate = activateOnGenerate;
    toast.message(`${label} ${tokens.label}…`, {
      description: willActivate
        ? "vai virar a ativa e propagar pras cartas. ~30s"
        : "salva no histórico, sem ativar. ~30s",
    });
    try {
      const { data, error } = await supabase.functions.invoke("generate-archetype-artwork", {
        body: { archetype, ...body, make_current: willActivate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (willActivate) {
        toast.success(`${tokens.label} pronto · ativa agora`);
        await load();
      } else {
        await load();
        // abre histórico automaticamente pra revisão
        await openHistory(archetype);
        toast.success(`nova versão de ${tokens.label} no histórico`, {
          description: "arte ativa não mudou. compara com a atual e clica 'definir como ativa' se gostar mais.",
          duration: 12000,
          action: {
            label: "ok, vou comparar",
            onClick: () => {},
          },
          className: "border-2 border-perestroika-laranja",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro ao gerar";
      toast.error(msg);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerate = (archetype: Archetype) => runGenerate(archetype, {}, "gerando");
  const handleGeneratePreset = (archetype: Archetype, preset: Preset) =>
    runGenerate(archetype, { preset }, `gerando ${preset}`);
  const handleGenerateCustom = (archetype: Archetype) =>
    runGenerate(archetype, { variables: customVars }, "gerando customizado");
  const handleRegenerateSeed = async (version: ArtworkVersion) => {
    if (!version.seed) {
      toast.error("essa versão não tem seed registrado");
      return;
    }
    closeHistory();
    await runGenerate(
      version.archetype,
      { seed: version.seed, variables: version.variables ?? undefined },
      "regerando seed",
    );
  };

  const handleRestore = async (version: ArtworkVersion) => {
    if (version.is_current) {
      toast.message("essa já é a versão atual");
      return;
    }
    setRestoringId(version.id);
    try {
      const { data, error } = await supabase.functions.invoke("restore-archetype-artwork", {
        body: { version_id: version.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("versão definida como ativa · propagada pras cartas");
      await load();
      await openHistory(version.archetype);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro ao restaurar";
      toast.error(msg);
    } finally {
      setRestoringId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    const filtered = historyVersions.filter((v) => {
      if (!v.variables) return true; // versões antigas sem variáveis sempre passam
      if (historyFilters.composition && v.variables.composition !== historyFilters.composition) return false;
      if (historyFilters.density && v.variables.density !== historyFilters.density) return false;
      if (historyFilters.rotation && v.variables.rotation !== historyFilters.rotation) return false;
      return true;
    });
    // ativa sempre no topo
    return [...filtered].sort((a, b) => {
      if (a.is_current && !b.is_current) return -1;
      if (!a.is_current && b.is_current) return 1;
      return 0;
    });
  }, [historyVersions, historyFilters]);

  const activeVersion = useMemo(
    () => historyVersions.find((v) => v.is_current) ?? null,
    [historyVersions],
  );

  const showHistoryFilters = historyVersions.length >= 6;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display uppercase text-4xl sm:text-5xl leading-none">
            artworks · arquétipos
          </h2>
          <p className="mt-2 text-perestroika-preto/70 text-sm max-w-2xl">
            gerados via nano banana pro. cada arquétipo tem 1 arte ativa, reaproveitada em todas as cartas.
            por padrão, gerar salva no histórico sem ativar – você compara e escolhe qual fica.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-3 py-2 text-[11px] uppercase tracking-wide text-perestroika-preto/70 hover:border-perestroika-preto/40 hover:text-perestroika-preto disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="copia a image_url da arte ativa pra todas as builder_cards do mesmo arquétipo, caso alguma esteja desatualizada"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            sincronizar todas as cartas
          </button>
          <label
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-wide cursor-pointer transition ${
              activateOnGenerate
                ? "border-perestroika-vermelho bg-perestroika-vermelho/10 text-perestroika-vermelho"
                : "border-perestroika-preto/20 text-perestroika-preto/60 hover:border-perestroika-preto/40 hover:text-perestroika-preto"
            }`}
            title="quando ligado, próxima geração já vira a ativa e propaga pras cartas"
          >
            <input
              type="checkbox"
              checked={activateOnGenerate}
              onChange={(e) => setActivateOnGenerate(e.target.checked)}
              className="accent-perestroika-vermelho"
            />
            ativar e propagar ao gerar
          </label>
        </div>
      </div>

      {/* faixa comparativa: os 6 lado-a-lado pra avaliar coerência visual */}
      <div className="mb-8 rounded-2xl border border-perestroika-preto/15 bg-perestroika-preto/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display uppercase text-lg leading-none text-perestroika-preto/80">
            comparar coerência
          </h3>
          <span className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
            {artworks.size}/6 gerados
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ARCHETYPES.map((archetype) => {
            const tokens = ARCHETYPE_TOKENS[archetype];
            const artwork = artworks.get(archetype);
            return (
              <div key={`cmp-${archetype}`} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => artwork && setLightboxFor(archetype)}
                  disabled={!artwork}
                  className="relative bg-perestroika-preto/5 rounded-md overflow-hidden group disabled:cursor-default enabled:cursor-zoom-in enabled:hover:ring-2 enabled:hover:ring-perestroika-preto/40 transition"
                  style={{ aspectRatio: "3 / 4" }}
                  aria-label={artwork ? `abrir ${tokens.label} em fullscreen` : `${tokens.label} ainda sem arte`}
                >
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-perestroika-preto/30" />
                    </div>
                  ) : artwork ? (
                    <img
                      src={artwork.image_url}
                      alt={`mini ${tokens.label}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
                      {tokens.emoji}
                    </div>
                  )}
                </button>
                <span className={`font-display uppercase text-[10px] leading-none truncate text-center ${tokens.text}`}>
                  {tokens.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARCHETYPES.map((archetype) => {
          const tokens = ARCHETYPE_TOKENS[archetype];
          const artwork = artworks.get(archetype);
          const isGenerating = generatingFor === archetype;
          const hasArt = !!artwork;
          const isCustomOpen = customOpenFor === archetype;
          const anyGenerating = generatingFor !== null;

          return (
            <div
              key={archetype}
              className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-hidden flex flex-col"
            >
              <div
                className="relative bg-perestroika-preto/5"
                style={{ aspectRatio: "3 / 4" }}
              >
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-perestroika-preto/30" />
                  </div>
                ) : hasArt ? (
                  <img
                    src={artwork.image_url}
                    alt={`artwork ${tokens.label}`}
                    onClick={() => setLightboxFor(archetype)}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-perestroika-preto/40">
                    <span className="text-5xl">{tokens.emoji}</span>
                    <span className="text-xs uppercase tracking-wide">sem arte ainda</span>
                  </div>
                )}
                {isGenerating && (
                  <div className="absolute inset-0 bg-perestroika-preto/60 flex flex-col items-center justify-center gap-3 text-perestroika-bege">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs uppercase tracking-wide">gerando…</span>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{tokens.emoji}</span>
                    <h3 className={`font-display uppercase text-2xl leading-none ${tokens.text}`}>
                      {tokens.label}
                    </h3>
                  </div>
                  <p className="text-[11px] text-perestroika-preto/50 uppercase tracking-wide">
                    {hasArt ? `gerado ${formatDate(artwork.generated_at)}` : "–"}
                  </p>
                </div>

                {hasArt && artwork.prompt_used && (
                  <details className="rounded-lg border border-perestroika-preto/10 bg-perestroika-preto/[0.04] p-2.5">
                    <summary className="flex items-center justify-between gap-2 cursor-pointer list-none">
                      <span className="text-[9px] uppercase tracking-wider text-perestroika-preto/50">
                        prompt usado
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopyPrompt(archetype, artwork.prompt_used!);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors"
                      >
                        {copiedFor === archetype ? (
                          <>
                            <Check className="w-3 h-3" />
                            copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            copiar
                          </>
                        )}
                      </button>
                    </summary>
                    <pre className="mt-2 text-[10px] leading-snug text-perestroika-preto/70 font-body whitespace-pre-wrap max-h-28 overflow-y-auto">
                      {artwork.prompt_used}
                    </pre>
                  </details>
                )}

                <div className="mt-auto flex flex-col gap-2">
                  {/* 3 botões principais lado-a-lado */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleGenerate(archetype)}
                      disabled={anyGenerating}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-2 py-2 text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                    >
                      {isGenerating && generatingFor === archetype ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : hasArt ? (
                        <RefreshCw className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      gerar
                    </button>
                    <button
                      onClick={() => handleGeneratePreset(archetype, "ousado")}
                      disabled={anyGenerating}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-perestroika-vermelho text-perestroika-bege px-2 py-2 text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                      title="density=dense, rotation=dynamic, noise=heavy"
                    >
                      ousado
                    </button>
                    <button
                      onClick={() => handleGeneratePreset(archetype, "clean")}
                      disabled={anyGenerating}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-perestroika-azul text-perestroika-bege px-2 py-2 text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                      title="density=sparse, rotation=static, noise=subtle"
                    >
                      clean
                    </button>
                  </div>

                  {/* personalizar tudo (collapse) */}
                  <button
                    type="button"
                    onClick={() => setCustomOpenFor(isCustomOpen ? null : archetype)}
                    className="inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-perestroika-preto/50 hover:text-perestroika-preto/80 transition"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${isCustomOpen ? "rotate-180" : ""}`} />
                    personalizar tudo
                  </button>
                  {isCustomOpen && (
                    <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/40 p-2.5 flex flex-col gap-2">
                      <VarSelect
                        label="composition"
                        value={customVars.composition}
                        options={COMPOSITIONS}
                        onChange={(v) => setCustomVars((c) => ({ ...c, composition: v }))}
                      />
                      <VarSelect
                        label="density"
                        value={customVars.density}
                        options={DENSITIES}
                        onChange={(v) => setCustomVars((c) => ({ ...c, density: v }))}
                      />
                      <VarSelect
                        label="accent"
                        value={customVars.accent}
                        options={ACCENTS}
                        onChange={(v) => setCustomVars((c) => ({ ...c, accent: v }))}
                      />
                      <VarSelect
                        label="rotation"
                        value={customVars.rotation}
                        options={ROTATIONS}
                        onChange={(v) => setCustomVars((c) => ({ ...c, rotation: v }))}
                      />
                      <VarSelect
                        label="noise"
                        value={customVars.noise}
                        options={NOISES}
                        onChange={(v) => setCustomVars((c) => ({ ...c, noise: v }))}
                      />
                      <button
                        onClick={() => handleGenerateCustom(archetype)}
                        disabled={anyGenerating}
                        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-[11px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                      >
                        <Sparkles className="w-3 h-3" />
                        gerar com estas variáveis
                      </button>
                    </div>
                  )}

                  {hasArt && (
                    <button
                      onClick={() => openHistory(archetype)}
                      disabled={anyGenerating}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-perestroika-preto/20 text-perestroika-preto/70 hover:text-perestroika-preto hover:border-perestroika-preto/40 px-4 py-2 text-[11px] uppercase tracking-wide transition disabled:opacity-40"
                    >
                      <History className="w-3 h-3" />
                      histórico
                      {pendingByArchetype.has(archetype) && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-perestroika-laranja text-perestroika-bege text-[10px] font-bold leading-none">
                          {pendingByArchetype.get(archetype)}
                        </span>
                      )}
                    </button>
                  )}
                  {hasArt && pendingByArchetype.has(archetype) && (
                    <p className="text-[10px] text-perestroika-laranja uppercase tracking-wide text-center -mt-1">
                      {pendingByArchetype.get(archetype)} versão{pendingByArchetype.get(archetype)! > 1 ? "ões" : ""} pendente{pendingByArchetype.get(archetype)! > 1 ? "s" : ""} de revisão
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lightboxFor && (() => {
        const lbArt = artworks.get(lightboxFor);
        const lbTokens = ARCHETYPE_TOKENS[lightboxFor];
        if (!lbArt) return null;
        const idx = generatedArchetypes.indexOf(lightboxFor);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`artwork ${lbTokens.label} em fullscreen`}
            onClick={closeLightbox}
            className="fixed inset-0 z-[100] bg-perestroika-preto/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          >
            {/* header */}
            <div
              className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 p-4 sm:p-6 text-perestroika-bege"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{lbTokens.emoji}</span>
                <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none truncate">
                  {lbTokens.label}
                </h3>
                {generatedArchetypes.length > 1 && (
                  <span className="text-[10px] uppercase tracking-wider opacity-50 ml-2 shrink-0">
                    {idx + 1}/{generatedArchetypes.length}
                  </span>
                )}
              </div>
              <button
                onClick={closeLightbox}
                className="rounded-full bg-perestroika-bege/10 hover:bg-perestroika-bege/20 p-2 transition"
                aria-label="fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* prev */}
            {generatedArchetypes.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 rounded-full bg-perestroika-bege/10 hover:bg-perestroika-bege/20 text-perestroika-bege p-2 sm:p-3 transition"
                aria-label="anterior"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* image */}
            <img
              src={lbArt.image_url}
              alt={`artwork ${lbTokens.label} fullscreen`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] w-auto h-auto object-contain rounded-lg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
              style={{ aspectRatio: "3 / 4" }}
            />

            {/* next */}
            {generatedArchetypes.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 rounded-full bg-perestroika-bege/10 hover:bg-perestroika-bege/20 text-perestroika-bege p-2 sm:p-3 transition"
                aria-label="próximo"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* footer */}
            <div
              className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-center text-perestroika-bege/60 text-[10px] uppercase tracking-wider"
              onClick={(e) => e.stopPropagation()}
            >
              esc fecha · ← → navega · gerado {formatDate(lbArt.generated_at)}
            </div>
          </div>
        );
      })()}

      {historyFor && (() => {
        const hTokens = ARCHETYPE_TOKENS[historyFor];
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`histórico ${hTokens.label}`}
            onClick={closeHistory}
            className="fixed inset-0 z-[110] bg-perestroika-preto/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-perestroika-bege rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-perestroika-preto/10">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-4 h-4 text-perestroika-preto/60 shrink-0" />
                  <span className="text-xl">{hTokens.emoji}</span>
                  <h3 className={`font-display uppercase text-2xl sm:text-3xl leading-none truncate ${hTokens.text}`}>
                    histórico · {hTokens.label}
                  </h3>
                </div>
                <button
                  onClick={closeHistory}
                  className="rounded-full hover:bg-perestroika-preto/10 p-2 transition"
                  aria-label="fechar"
                >
                  <X className="w-5 h-5 text-perestroika-preto" />
                </button>
              </div>

              {showHistoryFilters && (
                <div className="px-4 sm:px-5 py-3 border-b border-perestroika-preto/10 bg-perestroika-preto/[0.03] flex flex-wrap items-center gap-2">
                  <Filter className="w-3 h-3 text-perestroika-preto/40" />
                  <FilterChipGroup
                    label="composição"
                    options={COMPOSITIONS}
                    value={historyFilters.composition}
                    onChange={(v) => setHistoryFilters((f) => ({ ...f, composition: v }))}
                  />
                  <FilterChipGroup
                    label="densidade"
                    options={DENSITIES}
                    value={historyFilters.density}
                    onChange={(v) => setHistoryFilters((f) => ({ ...f, density: v }))}
                  />
                  <FilterChipGroup
                    label="rotação"
                    options={ROTATIONS}
                    value={historyFilters.rotation}
                    onChange={(v) => setHistoryFilters((f) => ({ ...f, rotation: v }))}
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {historyLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-perestroika-preto/40" />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <p className="py-12 text-center text-sm text-perestroika-preto/50">
                    {historyVersions.length === 0
                      ? "nenhuma versão registrada ainda"
                      : "nenhuma versão bate com esses filtros"}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredHistory.map((v) => {
                      const isRestoring = restoringId === v.id;
                      return (
                        <li
                          key={v.id}
                          className={`relative rounded-xl border overflow-hidden flex flex-col bg-perestroika-bege/40 ${
                            v.is_current
                              ? "border-perestroika-preto"
                              : "border-perestroika-preto/15"
                          }`}
                        >
                          <div
                            className="relative bg-perestroika-preto/5"
                            style={{ aspectRatio: "3 / 4" }}
                          >
                            <img
                              src={v.image_url}
                              alt={`versão ${formatDate(v.generated_at)}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                            />
                            {v.is_current && (
                              <span className="absolute top-2 left-2 bg-perestroika-preto text-perestroika-bege text-[9px] uppercase tracking-wider px-2 py-1 rounded-full shadow-lg">
                                ativa · propagada
                              </span>
                            )}
                            {v.preset && (
                              <span
                                className={`absolute top-2 right-2 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full ${
                                  v.preset === "ousado"
                                    ? "bg-perestroika-vermelho text-perestroika-bege"
                                    : "bg-perestroika-azul text-perestroika-bege"
                                }`}
                              >
                                {v.preset}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5 flex flex-col gap-2">
                            <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/60">
                              {formatDate(v.generated_at)}
                            </p>
                            {v.variables && (
                              <p className="text-[9px] leading-tight text-perestroika-preto/50 font-mono">
                                {v.variables.composition} · {v.variables.density} · {v.variables.accent} ·{" "}
                                {v.variables.rotation} · {v.variables.noise}
                              </p>
                            )}
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleRestore(v)}
                                disabled={v.is_current || restoringId !== null || generatingFor !== null}
                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-1.5 text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                              >
                                {isRestoring ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    ativando…
                                  </>
                                ) : v.is_current ? (
                                  "ativa agora"
                                ) : (
                                  <>
                                    <Undo2 className="w-3 h-3" />
                                    definir como ativa
                                  </>
                                )}
                              </button>
                              {!v.is_current && (
                                <button
                                  onClick={() => setCompareVersion(v)}
                                  disabled={generatingFor !== null || restoringId !== null}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-perestroika-preto/25 text-perestroika-preto/70 hover:text-perestroika-preto hover:border-perestroika-preto/50 px-3 py-1.5 text-[10px] uppercase tracking-wide transition disabled:opacity-30"
                                >
                                  comparar com a ativa
                                </button>
                              )}
                              {v.seed && (
                                <button
                                  onClick={() => handleRegenerateSeed(v)}
                                  disabled={generatingFor !== null || restoringId !== null}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-perestroika-preto/25 text-perestroika-preto/70 hover:text-perestroika-preto hover:border-perestroika-preto/50 px-3 py-1.5 text-[10px] uppercase tracking-wide transition disabled:opacity-30"
                                  title={`seed: ${v.seed.slice(0, 12)}…`}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  regerar seed
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="p-3 sm:p-4 border-t border-perestroika-preto/10 text-center text-[10px] uppercase tracking-wider text-perestroika-preto/50">
                restaurar substitui a arte em todas as cartas desse arquétipo
              </div>
            </div>
          </div>
        );
      })()}

      {compareVersion && (() => {
        const cTokens = ARCHETYPE_TOKENS[compareVersion.archetype];
        const active = activeVersion;
        const close = () => setCompareVersion(null);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="comparar versões"
            onClick={close}
            className="fixed inset-0 z-[120] bg-perestroika-preto/95 backdrop-blur-sm flex flex-col p-3 sm:p-6 animate-in fade-in duration-200"
          >
            <div
              className="flex items-center justify-between gap-3 text-perestroika-bege mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{cTokens.emoji}</span>
                <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none truncate">
                  comparar · {cTokens.label}
                </h3>
              </div>
              <button
                onClick={close}
                className="rounded-full bg-perestroika-bege/10 hover:bg-perestroika-bege/20 p-2 transition"
                aria-label="fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ativa */}
              <div className="flex flex-col gap-2 min-h-0">
                <div className="flex items-center gap-2 text-perestroika-bege/80">
                  <span className="bg-perestroika-bege text-perestroika-preto text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold">
                    ativa
                  </span>
                  <span className="text-[10px] uppercase tracking-wide opacity-70">
                    {active ? formatDate(active.generated_at) : "–"}
                  </span>
                </div>
                {active ? (
                  <>
                    <img
                      src={active.image_url}
                      alt="versão ativa"
                      className="w-full max-h-[55vh] object-contain rounded-lg bg-perestroika-preto/40"
                      style={{ aspectRatio: "3 / 4" }}
                    />
                    {active.variables && (
                      <p className="text-[10px] text-perestroika-bege/70 font-mono leading-tight">
                        {active.variables.composition} · {active.variables.density} · {active.variables.accent} · {active.variables.rotation} · {active.variables.noise}
                        {active.preset && <span className="ml-2 opacity-60">[{active.preset}]</span>}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-perestroika-bege/50 text-sm">sem versão ativa registrada no histórico</p>
                )}
              </div>

              {/* candidata */}
              <div className="flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between gap-2 text-perestroika-bege/80">
                  <div className="flex items-center gap-2">
                    <span className="bg-perestroika-vermelho text-perestroika-bege text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold">
                      candidata
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">
                      {formatDate(compareVersion.generated_at)}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const v = compareVersion;
                      close();
                      await handleRestore(v);
                    }}
                    disabled={restoringId !== null || generatingFor !== null}
                    className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege text-perestroika-preto px-3 py-1.5 text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Undo2 className="w-3 h-3" />
                    definir como ativa
                  </button>
                </div>
                <img
                  src={compareVersion.image_url}
                  alt="versão candidata"
                  className="w-full max-h-[55vh] object-contain rounded-lg bg-perestroika-preto/40"
                  style={{ aspectRatio: "3 / 4" }}
                />
                {compareVersion.variables && (
                  <p className="text-[10px] text-perestroika-bege/70 font-mono leading-tight">
                    {compareVersion.variables.composition} · {compareVersion.variables.density} · {compareVersion.variables.accent} · {compareVersion.variables.rotation} · {compareVersion.variables.noise}
                    {compareVersion.preset && <span className="ml-2 opacity-60">[{compareVersion.preset}]</span>}
                  </p>
                )}
              </div>
            </div>

            <div
              className="mt-3 text-center text-[10px] uppercase tracking-wider text-perestroika-bege/50"
              onClick={(e) => e.stopPropagation()}
            >
              esc fecha · definir como ativa propaga pras cartas
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ============= subcomponentes =============

type VarSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
};

const VarSelect = <T extends string>({ label, value, options, onChange }: VarSelectProps<T>) => (
  <label className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-perestroika-preto/70">
    <span>{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-perestroika-preto/20 bg-perestroika-bege px-2 py-1 text-[11px] text-perestroika-preto focus:outline-none focus:border-perestroika-preto"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
);

type FilterChipGroupProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
};

const FilterChipGroup = <T extends string>({ label, options, value, onChange }: FilterChipGroupProps<T>) => (
  <div className="flex items-center gap-1">
    <span className="text-[9px] uppercase tracking-wider text-perestroika-preto/40 mr-1">{label}</span>
    {options.map((o) => {
      const active = value === o;
      return (
        <button
          key={o}
          type="button"
          onClick={() => onChange(active ? null : o)}
          className={`text-[9px] uppercase tracking-wide px-2 py-1 rounded-full border transition ${
            active
              ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
              : "border-perestroika-preto/20 text-perestroika-preto/60 hover:border-perestroika-preto/40 hover:text-perestroika-preto"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);
