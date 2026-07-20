import { useEffect, useState } from "react";
import { Check, X, ExternalLink, FileWarning, ImageIcon, Link as LinkIcon, Paperclip, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeliverableInbox } from "../usePendingDeliverables";
import { useDeliverableAnswers } from "./useDeliverableAnswers";
import { useExplicitPillProgress } from "./useExplicitPillProgress";
import { getSignedUrl } from "./signedUrl";
import type { AnswerBlock, ResolvedAnswer } from "./types";

interface Props {
  deliverable: DeliverableInbox | null;
}

/**
 * Renderiza a entrega do estudante pro professor:
 * - cada pílula numerada com kind + título
 * - cada bloco em par pergunta/resposta
 * - pílula sem resposta vira chip "não respondida"
 * - prints/uploads viram link assinado com thumb (1h)
 */
export const DeliverableAnswersList = ({ deliverable }: Props) => {
  const { answers, isLoading, isError } = useDeliverableAnswers(deliverable);
  const { markedIds } = useExplicitPillProgress(deliverable);

  if (!deliverable) return null;

  if (isLoading) {
    return (
      <p className="text-sm text-perestroika-preto/50 italic">
        carregando perguntas e respostas…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-rose-700">
        falha ao carregar as pílulas deste módulo. tenta recarregar a página.
      </p>
    );
  }

  if (answers.length === 0) {
    return (
      <p className="text-sm text-perestroika-preto/50 italic">
        não encontramos pílulas cadastradas pra este módulo. confirma em /admin/aula.
      </p>
    );
  }

  const isDraft = deliverable.submitted_at === null && deliverable.status === "rascunho";

  // só esconde pílulas 100% passivas sem nenhum bloco; pílulas com qualquer
  // dado (mesmo via fallback raw) precisam aparecer pro educador.
  const visible = answers.filter((a) => !(a.state === "passiva" && a.blocks.length === 0));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-perestroika-preto/50 italic">
        este módulo só tem pílulas de leitura. o estudante marcou como concluído sem
        respostas escritas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((a) => {
        const isAutoCompleted =
          isDraft && a.state === "respondida" && !markedIds.has(a.pillId);
        return (
          <PillAnswerCard
            key={a.pillId}
            answer={a}
            index={a.order}
            autoCompleted={isAutoCompleted}
          />
        );
      })}
    </div>
  );
};

const stateBadge: Record<ResolvedAnswer["state"], { label: string; cls: string }> = {
  respondida: {
    label: "respondida",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  parcial: {
    label: "parcial",
    cls: "bg-amber-100 text-amber-800 border-amber-300",
  },
  "nao-respondida": {
    label: "não respondida",
    cls: "bg-rose-100 text-rose-800 border-rose-300",
  },
  passiva: { label: "passiva", cls: "bg-zinc-100 text-zinc-700 border-zinc-300" },
};

function PillAnswerCard({
  answer,
  index,
  autoCompleted = false,
}: {
  answer: ResolvedAnswer;
  index: number;
  autoCompleted?: boolean;
}) {
  const sb = stateBadge[answer.state];
  return (
    <div
      className={`rounded-xl border bg-perestroika-bege/60 p-4 ${
        answer.state === "nao-respondida" && answer.required
          ? "border-rose-300"
          : autoCompleted
            ? "border-perestroika-azul/40"
            : "border-perestroika-preto/15"
      }`}
    >
      {/* cabeçalho da pílula */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-perestroika-preto/55">
              pílula {String(index + 1).padStart(2, "0")}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {answer.kindLabel}
            </Badge>
            {answer.required && (
              <Badge variant="outline" className="text-[10px] uppercase border-perestroika-preto/40">
                obrigatória
              </Badge>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${sb.cls}`}
            >
              {sb.label}
            </span>
            {autoCompleted && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-perestroika-azul/50 bg-perestroika-azul/10 text-perestroika-azul px-2 py-0.5 text-[10px] uppercase tracking-wide"
                title="o estudante preencheu o conteúdo mas não clicou em 'marcar como feita'. o autosave reconheceu como completa."
              >
                <Sparkles className="w-2.5 h-2.5" />
                auto-concluída
              </span>
            )}
          </div>
          <p className="font-display uppercase text-base leading-tight">
            {answer.title}
          </p>
        </div>
      </div>



      {/* blocos */}
      {answer.blocks.length === 0 ? (
        <p className="text-xs text-perestroika-preto/50 italic">
          pílula sem campos de resposta.
        </p>
      ) : (
        <div className="space-y-3">
          {answer.blocks.map((b, i) => (
            <BlockRow key={i} block={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockRow({ block }: { block: AnswerBlock }) {
  return (
    <div className="rounded-lg bg-perestroika-preto/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5">
        pergunta
      </p>
      <p className="text-sm text-perestroika-preto/85 mb-2 leading-snug">
        {block.question}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5">
        resposta
      </p>
      <BlockBody block={block} />
    </div>
  );
}

function BlockBody({ block }: { block: AnswerBlock }) {
  if (block.kind === "empty") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-rose-700 italic">
        <FileWarning className="w-3.5 h-3.5" />
        não respondida{block.hint ? ` (${block.hint})` : ""}
      </p>
    );
  }

  if (block.kind === "text") {
    return (
      <p className="whitespace-pre-wrap text-sm text-perestroika-preto leading-relaxed">
        {block.answer}
      </p>
    );
  }

  if (block.kind === "choice") {
    return (
      <div className="space-y-1">
        <p className="text-sm text-perestroika-preto">
          <span className="font-mono text-xs text-perestroika-preto/50 mr-2">
            [{block.answer}]
          </span>
          {block.optionLabel ?? block.answer}
          {typeof block.isCorrect === "boolean" &&
            (block.isCorrect ? (
              <Check className="inline w-4 h-4 ml-2 text-emerald-600" />
            ) : (
              <X className="inline w-4 h-4 ml-2 text-rose-600" />
            ))}
        </p>
        {block.isCorrect === false && block.correctLabel && (
          <p className="text-xs text-perestroika-preto/60">
            certo era: <span className="font-medium">{block.correctLabel}</span>
          </p>
        )}
      </div>
    );
  }

  if (block.kind === "multi") {
    return (
      <div className="space-y-1">
        <ul className="text-sm space-y-0.5">
          {block.answers.map((a) => (
            <li key={a.value}>
              <span className="font-mono text-xs text-perestroika-preto/50 mr-2">
                [{a.value}]
              </span>
              {a.label}
            </li>
          ))}
        </ul>
        {typeof block.isCorrect === "boolean" &&
          (block.isCorrect ? (
            <p className="text-xs text-emerald-700">marcou certo</p>
          ) : (
            <p className="text-xs text-rose-700">
              esperado: {block.correctLabels?.join(", ")}
            </p>
          ))}
      </div>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="text-sm space-y-0.5">
        {block.items.map((it, i) => (
          <li key={i}>
            <span className="text-perestroika-preto/55">{it.label}:</span>{" "}
            <span>{it.value}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "checklist") {
    return (
      <ul className="text-sm space-y-1">
        {block.items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                it.checked
                  ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                  : "border-perestroika-preto/30 text-transparent"
              }`}
              aria-label={it.checked ? "marcado" : "não marcado"}
            >
              {it.checked ? "✓" : ""}
            </span>
            <span className={it.checked ? "" : "text-perestroika-preto/60"}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "upload") {
    return <UploadBlock block={block} />;
  }

  return null;
}

function UploadBlock({
  block,
}: {
  block: Extract<AnswerBlock, { kind: "upload" }>;
}) {
  const [url, setUrl] = useState<string | null>(block.url);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (block.url) {
      setUrl(block.url);
      return;
    }
    if (block.bucket && block.path) {
      setLoading(true);
      getSignedUrl(block.bucket, block.path)
        .then((u) => setUrl(u))
        .finally(() => setLoading(false));
    }
  }, [block.url, block.bucket, block.path]);

  const isImage = !!block.filename?.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  const Icon = block.kindLabel === "link" ? LinkIcon : isImage ? ImageIcon : Paperclip;

  if (loading) {
    return (
      <p className="text-xs text-perestroika-preto/55 italic">carregando arquivo…</p>
    );
  }

  if (!url) {
    return (
      <p className="text-xs text-rose-700">não foi possível carregar o arquivo.</p>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={url}
            alt={block.filename ?? "evidência"}
            className="w-20 h-20 object-cover rounded border border-perestroika-preto/15"
            loading="lazy"
          />
        </a>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-perestroika-preto hover:underline break-all"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="break-all">{block.filename ?? "abrir"}</span>
        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
      </a>
    </div>
  );
}
