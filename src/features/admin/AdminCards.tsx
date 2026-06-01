import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, RefreshCw, Copy, Pencil, Check, X, Square, ExternalLink, Globe, Link2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUrlState } from "@/hooks/useUrlState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  useBuilderCards,
  ARCHETYPE_LABEL,
  ARCHETYPE_EMOJI,
  type BuilderCard,
  type CardRow,
} from "./useBuilderCards";
import { CartaCompleta } from "@/components/carta/CartaCompleta";
import { TarotCard } from "@/components/carta/TarotCard";

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type EditableField = "tagline" | "essence_phrase" | "superpower_text" | "shadow_text" | "next_move_text";

const FIELD_LABELS: Record<EditableField, { label: string; help: string; rows: number }> = {
  tagline: { label: "tagline", help: "5 a 8 palavras, frase de impacto", rows: 2 },
  essence_phrase: { label: "essência", help: "4 a 8 palavras, lowercase", rows: 2 },
  superpower_text: { label: "superpoder", help: "2 parágrafos, separa com linha vazia", rows: 6 },
  shadow_text: { label: "sombra", help: "1 parágrafo, 40-70 palavras", rows: 4 },
  next_move_text: { label: "próximo movimento", help: "1 parágrafo, ação concreta", rows: 4 },
};

export const AdminCards = () => {
  const {
    rows,
    loading,
    generate,
    expandFields,
    regenerateFull,
    generatingFor,
    updateCardFields,
    togglePublish,
  } = useBuilderCards();
  const [selected, setSelected] = useState<CardRow | null>(null);
  const [cardIdParam, setCardIdParam] = useUrlState("card", "");

  // sync param -> selected (reidrata após rows carregar)
  useEffect(() => {
    if (!cardIdParam) {
      if (selected) setSelected(null);
      return;
    }
    if (selected?.card.id === cardIdParam) return;
    const found = rows.find((r) => r.card.id === cardIdParam);
    if (found) setSelected(found);
  }, [cardIdParam, rows, selected]);
  const [showReasoning, setShowReasoning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchMode, setBatchMode] = useState<"generate" | "expand" | "full" | "publish" | null>(null);
  const [drafts, setDrafts] = useState<Record<EditableField, string>>({
    tagline: "",
    essence_phrase: "",
    superpower_text: "",
    shadow_text: "",
    next_move_text: "",
  });
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [regeneratingOg, setRegeneratingOg] = useState(false);
  const [batchDelaySec, setBatchDelaySec] = useState(2);
  const cancelBatchRef = useRef(false);

  const handleRegenerateOg = async () => {
    if (!selected?.card) return;
    setRegeneratingOg(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-card-og-image", {
        body: { card_id: selected.card.id, force: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("og:image regerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "erro ao regerar og:image");
    } finally {
      setRegeneratingOg(false);
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const cancelBatch = () => {
    cancelBatchRef.current = true;
    toast.message("cancelando após a chamada atual…");
  };

  // sincroniza drafts quando muda de selecionado
  useEffect(() => {
    if (!selected?.card) return;
    setDrafts({
      tagline: selected.card.tagline ?? "",
      essence_phrase: selected.card.essence_phrase ?? "",
      superpower_text: selected.card.superpower_text ?? "",
      shadow_text: selected.card.shadow_text ?? "",
      next_move_text: selected.card.next_move_text ?? "",
    });
    setEditingField(null);
  }, [selected?.user_id, selected?.card?.tagline, selected?.card?.superpower_text]);

  const handleSaveField = async (field: EditableField) => {
    if (!selected?.card) return;
    setSavingField(field);
    const ok = await updateCardFields(selected.user_id, { [field]: drafts[field] });
    setSavingField(null);
    if (ok) {
      setEditingField(null);
      setSelected({
        ...selected,
        card: { ...selected.card, [field]: drafts[field].trim() || null } as BuilderCard,
      });
    }
  };

  const handleTogglePublish = async () => {
    if (!selected?.card) return;
    setPublishing(true);
    const newState = !selected.card.is_published;
    const ok = await togglePublish(selected.user_id, newState, selected.card.share_token);
    setPublishing(false);
    if (ok) {
      // se publicou e não tinha token, recarrega selected pelo rows atualizado depois
      // por enquanto reflete localmente o estado de publicação
      setSelected({
        ...selected,
        card: { ...selected.card, is_published: newState } as BuilderCard,
      });
    }
  };

  const publicUrl = selected?.card?.share_token
    ? `${window.location.origin}/carta/${selected.card.share_token}`
    : null;

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("link copiado");
  };

  const handleCopyText = (card: BuilderCard) => {
    navigator.clipboard.writeText(card.full_text ?? "");
    toast.success("carta copiada");
  };

  const firstName = (full: string | null | undefined) =>
    (full ?? "").trim().split(/\s+/)[0] || "";

  const handleCopyRowLink = (r: CardRow) => {
    if (!r.card?.share_token) return;
    const url = `${window.location.origin}/carta/${r.card.share_token}`;
    navigator.clipboard.writeText(url);
    const who = r.nickname || firstName(r.display_name) || "estudante";
    toast.success(`link de ${who} copiado`);
  };

  const handleCopyAllLinks = () => {
    const published = rows.filter((r) => r.card?.is_published && r.card?.share_token);
    if (published.length === 0) {
      toast.message("nenhuma carta publicada ainda");
      return;
    }
    const block = published
      .map((r) => {
        const who = r.nickname || firstName(r.display_name) || "estudante";
        return `${who} → ${window.location.origin}/carta/${r.card!.share_token}`;
      })
      .join("\n");
    navigator.clipboard.writeText(block);
    toast.success(`${published.length} links copiados`);
  };

  const pendingRows = rows.filter((r) => !r.card || r.card.status === "erro");
  const publishableRows = rows.filter(
    (r) => r.card && r.card.status === "pronta" && !r.card.is_published,
  );
  // cartas que já têm arquétipo definido mas faltam algum dos 4 campos novos.
  // essas a gente "expande" sem refazer a classificação.
  const expandableRows = rows.filter(
    (r) =>
      r.card &&
      r.card.status === "pronta" &&
      r.card.archetype &&
      (!r.card.tagline ||
        !r.card.superpower_text ||
        !r.card.shadow_text ||
        !r.card.next_move_text),
  );

  const runBatch = async (
    targetRows: CardRow[],
    runner: (userId: string) => Promise<unknown>,
    label: string,
  ) => {
    if (targetRows.length === 0) return;
    cancelBatchRef.current = false;
    setBatchProgress({ done: 0, total: targetRows.length });
    let success = 0;
    let fail = 0;
    let cancelled = false;
    for (let i = 0; i < targetRows.length; i++) {
      if (cancelBatchRef.current) {
        cancelled = true;
        break;
      }
      const row = targetRows[i];
      try {
        await runner(row.user_id);
        success++;
      } catch {
        fail++;
      }
      setBatchProgress({ done: i + 1, total: targetRows.length });
      if (i < targetRows.length - 1 && batchDelaySec > 0) {
        const steps = Math.max(1, Math.ceil((batchDelaySec * 1000) / 200));
        for (let s = 0; s < steps; s++) {
          if (cancelBatchRef.current) break;
          await sleep(Math.min(200, batchDelaySec * 1000 - s * 200));
        }
      }
    }
    setBatchProgress(null);
    setBatchMode(null);
    cancelBatchRef.current = false;
    toast.success(
      cancelled
        ? `${label} cancelado: ${success} ok, ${fail} com erro`
        : `${label} finalizado: ${success} ok, ${fail} com erro`,
    );
  };

  const handleBatch = async () => {
    if (pendingRows.length === 0) return;
    const ok = window.confirm(
      `gerar carta para ${pendingRows.length} estudante(s) sem carta? vai rodar uma de cada vez. consome créditos de IA (texto + imagem por estudante).`,
    );
    if (!ok) return;
    setBatchMode("generate");
    await runBatch(pendingRows, generate, "geração");
  };

  const handleExpandBatch = async () => {
    if (expandableRows.length === 0) return;
    const ok = window.confirm(
      `expandir ${expandableRows.length} carta(s) existente(s)? mantém o arquétipo e gera só tagline, superpoder, sombra e próximo movimento. consome créditos de IA (1 chamada de texto por estudante).`,
    );
    if (!ok) return;
    setBatchMode("expand");
    await runBatch(expandableRows, expandFields, "expansão");
  };

  /** regera tudo do zero pra todos os estudantes com fbi: texto+arquetipo → imagem → og.
   *  apaga e re-classifica. usar quando o pipeline mudou. */
  const handleFullRegenBatch = async () => {
    if (rows.length === 0) return;
    const ok = window.confirm(
      `regerar TUDO do zero (texto + imagem + og) pra ${rows.length} estudante(s)? ` +
        `essa é a opção pesada: re-classifica arquetipo, regera ilustração e og:image. ` +
        `vai consumir créditos de IA. continuar?`,
    );
    if (!ok) return;
    setBatchMode("full");
    await runBatch(rows, regenerateFull, "regeração completa");
  };

  const handlePublishAllBatch = async () => {
    if (publishableRows.length === 0) return;
    const ok = window.confirm(
      `publicar ${publishableRows.length} carta(s)? cada estudante passa a ter link público compartilhável. cada publicação gera 1 og:image (consome créditos de IA).`,
    );
    if (!ok) return;
    setBatchMode("publish");
    await runBatch(
      publishableRows,
      async (userId) => {
        const row = publishableRows.find((r) => r.user_id === userId);
        await togglePublish(userId, true, row?.card?.share_token ?? null);
      },
      "publicação",
    );
  };

  const isBatching = batchProgress !== null;

  return (
    <div>
      <div className="mb-6 flex flex-row flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display uppercase text-4xl sm:text-5xl leading-none">
            cartas · arquétipo de builder
          </h2>
          <p className="mt-2 text-perestroika-preto/70 text-sm">
            {loading
              ? "carregando…"
              : `${rows.length} estudantes com fbi enviado · ${pendingRows.length} sem carta`}
          </p>
        </div>
        <div className="flex flex-row flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wide text-perestroika-preto/60">
            delay
            <input
              type="number"
              min={0}
              max={30}
              value={batchDelaySec}
              onChange={(e) => setBatchDelaySec(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              disabled={isBatching}
              className="w-14 rounded-md bg-white/80 border border-perestroika-preto/20 px-2 py-1 text-xs text-perestroika-preto focus:outline-none focus:border-perestroika-laranja disabled:opacity-40"
            />
            s
          </label>
          <button
            onClick={handleBatch}
            disabled={isBatching || pendingRows.length === 0 || loading}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {isBatching && batchMode === "generate" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                gerando {batchProgress!.done}/{batchProgress!.total}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                gerar todas pendentes ({pendingRows.length})
              </>
            )}
          </button>
          <button
            onClick={handleExpandBatch}
            disabled={isBatching || expandableRows.length === 0 || loading}
            title="mantém arquétipo já classificado, só regera tagline + superpoder + sombra + próximo movimento"
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 bg-perestroika-bege text-perestroika-preto px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {isBatching && batchMode === "expand" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                expandindo {batchProgress!.done}/{batchProgress!.total}
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                expandir cartas existentes ({expandableRows.length})
              </>
            )}
          </button>
          <button
            onClick={handleFullRegenBatch}
            disabled={isBatching || rows.length === 0 || loading}
            title="apaga e refaz tudo: arquetipo + texto + ilustração + og:image. usar quando o pipeline mudou."
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-vermelho text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {isBatching && batchMode === "full" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                regerando {batchProgress!.done}/{batchProgress!.total}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                regerar tudo do zero ({rows.length})
              </>
            )}
          </button>
          <button
            onClick={handlePublishAllBatch}
            disabled={isBatching || publishableRows.length === 0 || loading}
            title="publica todas as cartas prontas que ainda estão como rascunho"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-laranja text-perestroika-preto px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {isBatching && batchMode === "publish" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                publicando {batchProgress!.done}/{batchProgress!.total}
              </>
            ) : (
              <>
                <Globe className="w-3 h-3" />
                publicar todas ({publishableRows.length})
              </>
            )}
          </button>
          <button
            onClick={handleCopyAllLinks}
            disabled={isBatching}
            title="copia todos os links das cartas publicadas em bloco"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto underline-offset-4 hover:underline disabled:opacity-40"
          >
            <Link2 className="w-3 h-3" /> copiar todos os links
          </button>
          {isBatching && (
            <button
              onClick={cancelBatch}
              disabled={cancelBatchRef.current}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-vermelho text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
            >
              <Square className="w-3 h-3 fill-current" />
              {cancelBatchRef.current ? "cancelando…" : "cancelar"}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">estudante</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">fbi enviado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">arquétipo</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">público</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  carregando…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  ninguém enviou o fbi por enquanto
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => {
                const isGenerating = generatingFor === r.user_id || r.card?.status === "gerando";
                const isReady = r.card?.status === "pronta";
                const isError = r.card?.status === "erro";
                return (
                  <TableRow key={r.user_id} className="hover:bg-perestroika-preto/5">
                    <TableCell className="font-medium">
                      {r.display_name ?? r.email ?? "–"}
                      {r.nickname && (
                        <span className="text-perestroika-preto/50 text-xs ml-2">@{r.nickname}</span>
                      )}
                      {r.is_orphan && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] uppercase tracking-wide border-perestroika-rosa/40 text-perestroika-rosa bg-perestroika-rosa/5"
                        >
                          órfã
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-perestroika-preto/70">
                      {formatDate(r.submitted_at)}
                    </TableCell>
                    <TableCell>
                      {r.card?.archetype ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xl">{r.card.emoji ?? ARCHETYPE_EMOJI[r.card.archetype]}</span>
                          <span>{ARCHETYPE_LABEL[r.card.archetype] ?? r.card.archetype}</span>
                        </span>
                      ) : (
                        <span className="text-perestroika-preto/30">–</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!r.card && (
                        <Badge variant="outline" className="text-xs">sem carta</Badge>
                      )}
                      {isGenerating && (
                        <Badge className="bg-perestroika-azul/10 text-perestroika-azul border-perestroika-azul/30 text-xs">
                          gerando…
                        </Badge>
                      )}
                      {isReady && (
                        <Badge className="bg-perestroika-preto text-perestroika-bege text-xs">pronta</Badge>
                      )}
                      {isError && (
                        <Badge className="bg-perestroika-vermelho/10 text-perestroika-vermelho border-perestroika-vermelho/30 text-xs">
                          erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.card?.is_published ? (
                        <Badge className="bg-perestroika-laranja text-perestroika-bege text-xs inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" /> publicada
                        </Badge>
                      ) : isReady ? (
                        <Badge variant="outline" className="text-xs text-perestroika-preto/50">rascunho</Badge>
                      ) : (
                        <span className="text-perestroika-preto/20 text-xs">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {isReady && r.card?.is_published && r.card?.share_token && (
                          <a
                            href={`/c/${r.card.share_token}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="abrir carta pública em nova aba"
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-perestroika-laranja hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> pública
                          </a>
                        )}
                        {isReady && r.card?.is_published && r.card?.share_token && (
                          <button
                            onClick={() => handleCopyRowLink(r)}
                            title="copiar link público desta carta"
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                          >
                            <Link2 className="w-3 h-3" /> <span className="hidden sm:inline">copiar</span>
                          </button>
                        )}
                        {isReady && (
                          <button
                            onClick={() => {
                              setCardIdParam(r.card?.id ?? "");
                              setShowReasoning(false);
                            }}
                            className="text-xs uppercase tracking-wide hover:underline"
                          >
                            ver
                          </button>
                        )}
                        <button
                          onClick={() => generate(r.user_id)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-1.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : r.card ? (
                            <RefreshCw className="w-3 h-3" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {r.card ? "regerar" : "gerar"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* dialog: preview da carta + edição */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setCardIdParam("")}>
        <DialogContent className="max-w-7xl w-[min(1400px,96vw)] max-h-[92vh] overflow-y-auto bg-perestroika-bege p-0">
          <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 bg-perestroika-bege z-10 border-b border-perestroika-preto/10">
            <DialogTitle className="font-display uppercase text-2xl flex items-center gap-3 flex-wrap">
              <span>{selected?.card?.emoji} carta · {selected?.display_name}</span>
              {selected?.card?.is_published && (
                <Badge className="bg-perestroika-laranja text-perestroika-bege text-[10px]">publicada</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected?.card && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
              {/* preview da carta como o estudante vai ver */}
              <div className="border-r border-perestroika-preto/10 max-h-[80vh] overflow-y-auto bg-perestroika-bege">
                {/* tarot card renderizada (igual ao que o estudante vê em /app/carta e /c/{token}) */}
                <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-2 border-b border-perestroika-preto/10">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50 self-start">
                    tarot card (preview do estudante)
                  </div>
                  <div className="w-[300px] py-2">
                    <TarotCard
                      archetype={selected.card.archetype ?? "visionario"}
                      imageUrl={selected.card.image_url}
                      nickname={selected.nickname ?? selected.display_name}
                      size="hero"
                    />
                  </div>
                </div>
                <CartaCompleta
                  data={{
                    display_name: selected.display_name,
                    nickname: selected.nickname,
                    archetype: selected.card.archetype ?? "visionario",
                    emoji: selected.card.emoji,
                    essence_phrase: selected.card.essence_phrase,
                    tagline: selected.card.tagline,
                    superpower_text: selected.card.superpower_text,
                    shadow_text: selected.card.shadow_text,
                    next_move_text: selected.card.next_move_text,
                    full_text: selected.card.full_text,
                  }}
                  embedded
                />
              </div>

              {/* painel admin: edição + publicação */}
              <aside className="p-5 space-y-5 max-h-[80vh] overflow-y-auto bg-perestroika-bege/60">
                {/* publicação */}
                <div className="rounded-lg border border-perestroika-preto/15 bg-white/60 p-4 space-y-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50">
                    publicação
                  </div>
                  <button
                    onClick={handleTogglePublish}
                    disabled={publishing}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 ${
                      selected.card.is_published
                        ? "bg-perestroika-preto text-perestroika-bege"
                        : "bg-perestroika-laranja text-perestroika-preto"
                    }`}
                  >
                    {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                    {selected.card.is_published ? "despublicar" : "publicar carta"}
                  </button>
                  {publicUrl && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">link público</div>
                      <code className="block text-[11px] bg-perestroika-preto/5 rounded px-2 py-1.5 break-all text-perestroika-preto/80">
                        {publicUrl}
                      </code>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyLink}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-perestroika-preto/30 px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/5"
                        >
                          <Link2 className="w-3 h-3" /> copiar
                        </button>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-perestroika-preto/30 px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/5"
                        >
                          <ExternalLink className="w-3 h-3" /> abrir
                        </a>
                      </div>
                      <button
                        onClick={handleRegenerateOg}
                        disabled={regeneratingOg}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40"
                        title="regera o preview que aparece quando o link é compartilhado no whatsapp/linkedin"
                      >
                        {regeneratingOg ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        {regeneratingOg ? "gerando preview…" : "regerar preview de compartilhamento"}
                      </button>
                    </div>
                  )}
                </div>

                {/* campos editáveis */}
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50">
                    editar conteúdo
                  </div>

                  {(Object.keys(FIELD_LABELS) as EditableField[]).map((field) => {
                    const config = FIELD_LABELS[field];
                    const isEditing = editingField === field;
                    const isSaving = savingField === field;
                    const currentValue = selected.card?.[field] ?? null;

                    return (
                      <div
                        key={field}
                        className="rounded-lg border border-perestroika-preto/15 bg-white/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-perestroika-preto/60 font-semibold">
                            {config.label}
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => setEditingField(field)}
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/50 hover:text-perestroika-preto"
                            >
                              <Pencil className="w-3 h-3" /> editar
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveField(field)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-azul hover:underline disabled:opacity-40"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingField(null);
                                  setDrafts((d) => ({ ...d, [field]: currentValue ?? "" }));
                                }}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/50 hover:text-perestroika-preto disabled:opacity-40"
                              >
                                <X className="w-3 h-3" /> cancelar
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <>
                            <Textarea
                              value={drafts[field]}
                              onChange={(e) => setDrafts((d) => ({ ...d, [field]: e.target.value }))}
                              rows={config.rows}
                              autoFocus
                              className="text-xs bg-white/80 border-perestroika-preto/20 focus-visible:ring-perestroika-laranja"
                            />
                            <p className="text-[10px] text-perestroika-preto/40">{config.help}</p>
                          </>
                        ) : (
                          <p className="text-xs text-perestroika-preto/80 whitespace-pre-wrap">
                            {currentValue || (
                              <span className="italic text-perestroika-preto/40">vazio</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ações texto */}
                <div className="flex flex-col gap-2 pt-2 border-t border-perestroika-preto/10">
                  <button
                    onClick={() => handleCopyText(selected.card!)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-xs uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-transform"
                  >
                    <Copy className="w-3 h-3" /> copiar carta original
                  </button>
                  <button
                    onClick={() => generate(selected.user_id)}
                    disabled={generatingFor === selected.user_id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-perestroika-preto/30 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40"
                  >
                    {generatingFor === selected.user_id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    regerar carta inteira
                  </button>
                </div>

                {selected.card.reasoning && (
                  <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
                    <CollapsibleTrigger className="text-[10px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto">
                      {showReasoning ? "ocultar" : "ver"} por que esse arquétipo
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 text-xs text-perestroika-preto/70 italic border-l-2 border-perestroika-preto/20 pl-3">
                      {selected.card.reasoning}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="pt-3 border-t border-perestroika-preto/10 text-[10px] text-perestroika-preto/50">
                  gerada em {formatDate(selected.card.generated_at)} · {selected.card.model}
                </div>
              </aside>
            </div>
          )}
          {selected?.card?.status === "erro" && (
            <div className="text-sm text-perestroika-vermelho p-6">
              {selected.card.error_message ?? "deu algum erro. tenta regerar?"}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
