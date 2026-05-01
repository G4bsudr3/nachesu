import { useState } from "react";
import { Check, Loader2, Vote, Trophy, Lock, Download, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import type { Mascote, VotingStatus } from "@/features/hub/useHubInsights";
import { useMascoteVoting } from "@/features/hub/useMascoteVoting";
import { Dialog, DialogContent } from "@/components/ui/dialog";

async function downloadMascoteImage(url: string, nome: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("falha no fetch");
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const a = document.createElement("a");
    const objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = `mascote-${nome.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
    toast.success("baixado 🤙");
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.message("abri numa nova aba, segura pra salvar");
  }
}

const MascoteLightbox = ({
  mascote,
  votos,
  total,
  isWinner,
  onClose,
}: {
  mascote: Mascote;
  votos: number;
  total: number;
  isWinner: boolean;
  onClose: () => void;
}) => {
  const [downloading, setDownloading] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl border-2 border-perestroika-preto bg-perestroika-bege p-0 sm:rounded-[2rem]">
        <div className="flex flex-col">
          <div
            className="flex items-center justify-center p-4 sm:p-8"
            style={{ background: "#f2e4d8" }}
          >
            {mascote.image_url ? (
              <img
                src={mascote.image_url}
                alt={mascote.nome}
                className="max-h-[60vh] w-auto object-contain"
              />
            ) : (
              <span className="font-display text-6xl uppercase text-perestroika-preto/40">
                {mascote.nome}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 border-t-2 border-perestroika-preto p-5 sm:p-8">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-perestroika-preto px-2.5 py-1 font-body text-[10px] uppercase tracking-wide text-perestroika-bege">
              {isWinner && <Trophy className="h-3 w-3" strokeWidth={3} />}
              {total > 0 ? `${votos} de ${total} votos` : "candidato"}
            </span>
            <h3 className="font-display text-4xl uppercase leading-[0.85] sm:text-6xl">
              {mascote.nome}
            </h3>
            {mascote.tracos?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mascote.tracos.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-perestroika-preto/30 bg-white/60 px-2.5 py-0.5 font-body text-xs text-perestroika-preto/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {mascote.por_que && (
              <p className="font-body text-base leading-relaxed text-perestroika-preto/85">
                {mascote.por_que}
              </p>
            )}
            {mascote.image_url && (
              <button
                type="button"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  await downloadMascoteImage(mascote.image_url!, mascote.nome);
                  setDownloading(false);
                }}
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 font-body text-sm text-perestroika-bege transition hover:bg-perestroika-preto/85 disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "baixando…" : "baixar imagem"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Props {
  candidatos: Mascote[];
  selectedIndex: number;
  finalTally?: number[];
  insightId: string | null;
  votingStatus: VotingStatus;
  isAdmin: boolean;
  onChanged: () => void;
}

export const MascoteSelector = ({
  candidatos,
  selectedIndex,
  finalTally,
  insightId,
  votingStatus,
  isAdmin,
  onChanged,
}: Props) => {
  const voting = useMascoteVoting({
    insightId,
    status: votingStatus,
    candidatosCount: candidatos.length,
    isAdmin,
  });

  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  if (!candidatos.length) return null;

  // ============== MODO ENCERRADA: oficial em destaque ==============
  if (votingStatus === "encerrada") {
    const oficial = candidatos[selectedIndex] ?? candidatos[0];
    const votos = finalTally?.[selectedIndex] ?? 0;
    const totalVotos = finalTally?.reduce((a, b) => a + b, 0) ?? 0;
    const outros = candidatos.filter((_, i) => i !== selectedIndex);

    return (
      <div>
        <div className="mb-3">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            mascote oficial · escolhido pela turma
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border-2 border-perestroika-preto bg-perestroika-bege">
          <div className="grid gap-0 sm:grid-cols-[1fr_1.2fr]">
            <button
              type="button"
              onClick={() => oficial.image_url && setZoomIndex(selectedIndex)}
              aria-label={`ver ${oficial.nome} em tamanho grande`}
              className="group relative flex aspect-square items-center justify-center sm:aspect-auto"
              style={{ background: "#f2e4d8" }}
            >
              {oficial.image_url ? (
                <>
                  <img
                    src={oficial.image_url}
                    alt={`mascote oficial: ${oficial.nome}`}
                    className="h-full w-full cursor-zoom-in object-contain p-6 transition group-hover:scale-[1.02]"
                  />
                  <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-perestroika-preto/85 px-2 py-1 font-body text-[10px] uppercase tracking-wide text-perestroika-bege opacity-0 transition group-hover:opacity-100">
                    <ZoomIn className="h-3 w-3" /> ver grande
                  </span>
                </>
              ) : (
                <span className="font-display text-6xl uppercase text-perestroika-preto/40">
                  {oficial.nome}
                </span>
              )}
            </button>

            <div className="flex flex-col justify-center gap-4 border-t-2 border-perestroika-preto p-6 sm:border-l-2 sm:border-t-0 sm:p-10">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fe7b02] px-2.5 py-1 font-body text-[10px] uppercase tracking-wide text-white">
                <Trophy className="h-3 w-3" strokeWidth={3} />
                {totalVotos > 0 ? `venceu com ${votos} de ${totalVotos} votos` : "mascote oficial"}
              </span>

              <h3 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
                {oficial.nome}
              </h3>

              {oficial.tracos?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {oficial.tracos.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-perestroika-preto/30 bg-white/60 px-2.5 py-0.5 font-body text-xs text-perestroika-preto/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="font-body text-base leading-relaxed text-perestroika-preto/85 sm:text-lg">
                {oficial.por_que}
              </p>
            </div>
          </div>
        </div>

        {outros.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/40">
              os que concorreram · clica pra ver grande
            </p>
            <div className="flex flex-wrap gap-3">
              {candidatos.map((c, i) => {
                if (i === selectedIndex) return null;
                const v = finalTally?.[i] ?? 0;
                return (
                  <button
                    type="button"
                    key={`${c.nome}-${i}`}
                    onClick={() => setZoomIndex(i)}
                    aria-label={`ver ${c.nome} em tamanho grande`}
                    className="group flex cursor-zoom-in items-center gap-3 rounded-full border border-perestroika-preto/20 bg-white/50 px-3 py-1.5 transition hover:border-perestroika-preto/50 hover:bg-white/85"
                  >
                    {c.image_url && (
                      <img src={c.image_url} alt={c.nome} className="h-8 w-8 rounded-full object-cover" />
                    )}
                    <span className="font-body text-sm text-perestroika-preto/80">{c.nome}</span>
                    {finalTally && (
                      <span className="font-body text-xs tabular-nums text-perestroika-preto/50">
                        {v} {v === 1 ? "voto" : "votos"}
                      </span>
                    )}
                    <ZoomIn className="h-3.5 w-3.5 text-perestroika-preto/40 transition group-hover:text-perestroika-preto/80" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {zoomIndex !== null && candidatos[zoomIndex] && (
          <MascoteLightbox
            mascote={candidatos[zoomIndex]}
            votos={finalTally?.[zoomIndex] ?? 0}
            total={totalVotos}
            isWinner={zoomIndex === selectedIndex}
            onClose={() => setZoomIndex(null)}
          />
        )}
      </div>
    );
  }

  // ============== MODO ABERTA: 3 cards lado a lado, vota uma vez ==============
  if (votingStatus === "aberta") {
    const handleVote = async (index: number) => {
      const res = await voting.vote(index);
      setConfirmIndex(null);
      if (res.error) {
        toast.error("não consegui registrar teu voto. tenta de novo.");
      } else {
        toast.success(`voto registrado em ${candidatos[index].nome}. agora é torcer.`);
      }
    };

    const handleClose = async () => {
      const res = await voting.close();
      if (res.error) {
        toast.error("não consegui fechar a votação.");
      } else {
        toast.success("votação encerrada. mascote oficializado.");
        onChanged();
      }
    };

    const jaVotou = voting.myVote !== null;

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
              votação aberta · escolhe o mascote da turma
            </p>
            <p className="mt-1 font-body text-sm text-perestroika-preto/70">
              {jaVotou
                ? `tu votou em ${candidatos[voting.myVote!].nome}. agora é esperar a turma fechar.`
                : "olha os 3 candidatos. tu vota uma vez só, sem trocar depois."}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleClose}
              disabled={voting.busy}
              className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors hover:bg-transparent hover:text-perestroika-preto disabled:opacity-60"
            >
              {voting.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              fechar e oficializar
            </button>
          )}
        </div>

        {/* status: participação */}
        {isAdmin && voting.totalElegiveis > 0 && (
          <div className="mb-5 rounded-2xl border border-perestroika-preto/15 bg-white/50 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                participação
              </span>
              <span className="font-body text-sm tabular-nums text-perestroika-preto/80">
                {voting.totalVotos} de {voting.totalElegiveis} votaram
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-perestroika-preto/10">
              <div
                className="h-full bg-[#fe7b02] transition-all"
                style={{ width: `${voting.participation}%` }}
              />
            </div>

            {/* parciais admin-only */}
            <div className="mt-4 space-y-1.5">
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50">
                parciais (só tu vê)
              </p>
              {candidatos.map((c, i) => {
                const v = voting.tally[i] ?? 0;
                const pct = voting.totalVotos > 0 ? Math.round((v / voting.totalVotos) * 100) : 0;
                return (
                  <div key={`tally-${i}`} className="flex items-center gap-3">
                    <span className="w-32 truncate font-body text-xs text-perestroika-preto/80">
                      {c.nome}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-perestroika-preto/10">
                      <div className="absolute inset-y-0 left-0 bg-perestroika-preto" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right font-body text-xs tabular-nums text-perestroika-preto/60">
                      {v} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {candidatos.map((c, i) => {
            const isMine = voting.myVote === i;
            const disabled = jaVotou || voting.busy;
            return (
              <article
                key={`${c.nome}-${i}`}
                className={`flex flex-col overflow-hidden rounded-3xl border-2 transition-all ${
                  isMine
                    ? "border-[#fe7b02] bg-perestroika-bege"
                    : jaVotou
                      ? "border-perestroika-preto/15 bg-white/40 opacity-60"
                      : "border-perestroika-preto bg-perestroika-bege"
                }`}
              >
                <div
                  className="flex aspect-square items-center justify-center"
                  style={{ background: "#f2e4d8" }}
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.nome} className="h-full w-full object-contain p-4" />
                  ) : (
                    <span className="font-display text-4xl uppercase text-perestroika-preto/40">{c.nome}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 border-t-2 border-perestroika-preto/10 p-5">
                  {isMine && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fe7b02] px-2 py-0.5 font-body text-[10px] uppercase tracking-wide text-white">
                      <Check className="h-3 w-3" strokeWidth={3} /> teu voto
                    </span>
                  )}
                  <h4 className="font-display text-3xl uppercase leading-[0.9]">{c.nome}</h4>
                  {c.tracos?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.tracos.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-perestroika-preto/20 bg-white/60 px-2 py-0.5 font-body text-[11px] text-perestroika-preto/75"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="font-body text-sm leading-relaxed text-perestroika-preto/80">
                    {c.por_que}
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmIndex(i)}
                    disabled={disabled}
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 font-body text-xs uppercase tracking-wide transition-colors ${
                      isMine
                        ? "border-[#fe7b02] bg-[#fe7b02] text-white"
                        : jaVotou
                          ? "border-perestroika-preto/20 text-perestroika-preto/40"
                          : "border-perestroika-preto bg-perestroika-preto text-perestroika-bege hover:bg-transparent hover:text-perestroika-preto"
                    } disabled:cursor-not-allowed`}
                  >
                    {isMine ? <Check className="h-3.5 w-3.5" /> : <Vote className="h-3.5 w-3.5" />}
                    {isMine ? "teu voto" : jaVotou ? "tu já votou" : "votar nesse"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* modal confirmação */}
        {confirmIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => !voting.busy && setConfirmIndex(null)}
          >
            <div
              className="max-w-md rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-3xl uppercase leading-[0.9]">
                votar em {candidatos[confirmIndex].nome}?
              </h4>
              <p className="mt-3 font-body text-sm text-perestroika-preto/75">
                tu vota uma vez só. depois não dá pra trocar nem desfazer. tem certeza?
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmIndex(null)}
                  disabled={voting.busy}
                  className="flex-1 rounded-full border-2 border-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege"
                >
                  pensar mais
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(confirmIndex)}
                  disabled={voting.busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-2 border-perestroika-preto bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege disabled:opacity-60"
                >
                  {voting.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Vote className="h-3.5 w-3.5" />}
                  confirmar voto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============== MODO FECHADA: preview dos candidatos (admin abre votação) ==============
  const handleOpen = async () => {
    const res = await voting.open();
    if (res.error) {
      toast.error("não consegui abrir a votação.");
    } else {
      toast.success("votação aberta. avisa a turma!");
      onChanged();
    }
  };

  const active = candidatos[activeIndex] ?? candidatos[0];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            mascote dessa turma
          </p>
          {isAdmin ? (
            <p className="mt-1 font-body text-sm text-perestroika-preto/70">
              a ia trouxe {candidatos.length} candidatos. abre a votação pra turma decidir o oficial.
            </p>
          ) : (
            <p className="mt-1 font-body text-sm text-perestroika-preto/70">
              {candidatos.length} candidatos prontos. a votação ainda não abriu.
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpen}
            disabled={voting.busy}
            className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors hover:bg-transparent hover:text-perestroika-preto disabled:opacity-60"
          >
            {voting.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Vote className="h-3.5 w-3.5" />}
            abrir votação da turma
          </button>
        )}
      </div>

      {/* tabs numéricos pra preview */}
      {candidatos.length > 1 && (
        <div className="mb-3 flex gap-1.5">
          {candidatos.map((c, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={`tab-${c.nome}-${i}`}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`ver ${c.nome}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-base transition-colors ${
                  isActive
                    ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                    : "border-perestroika-preto/30 bg-white/60 text-perestroika-preto/60 hover:border-perestroika-preto"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border-2 border-perestroika-preto bg-perestroika-bege">
        <div className="grid gap-0 sm:grid-cols-[1fr_1.2fr]">
          <div
            className="flex aspect-square items-center justify-center sm:aspect-auto"
            style={{ background: "#f2e4d8" }}
          >
            {active.image_url ? (
              <img
                src={active.image_url}
                alt={`candidato: ${active.nome}`}
                className="h-full w-full object-contain p-6"
              />
            ) : (
              <span className="font-display text-6xl uppercase text-perestroika-preto/40">
                {active.nome}
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center gap-4 border-t-2 border-perestroika-preto p-6 sm:border-l-2 sm:border-t-0 sm:p-10">
            <span className="inline-flex w-fit items-center rounded-full border border-perestroika-preto/30 bg-white/60 px-2 py-0.5 font-body text-[10px] uppercase tracking-wide text-perestroika-preto/70">
              candidato {activeIndex + 1} de {candidatos.length}
            </span>

            <h3 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
              {active.nome}
            </h3>

            {active.tracos?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {active.tracos.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-perestroika-preto/30 bg-white/60 px-2.5 py-0.5 font-body text-xs text-perestroika-preto/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <p className="font-body text-base leading-relaxed text-perestroika-preto/85 sm:text-lg">
              {active.por_que}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
