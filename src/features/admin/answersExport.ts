import { resolvePill } from "./deliverableRendering/resolvers";
import type {
  AnswerBlock,
  DeliverableContent,
  PillForResolve,
} from "./deliverableRendering/types";
import type { DeliverableInbox } from "./usePendingDeliverables";

/** transforma um bloco de resposta em texto plano pro csv */
export function blockToText(block: AnswerBlock): string {
  switch (block.kind) {
    case "text":
      return block.answer ?? "";
    case "choice":
      return block.optionLabel ? `${block.optionLabel} (${block.answer})` : block.answer;
    case "multi":
      return block.answers.map((a) => a.label || a.value).join(" | ");
    case "upload":
      return block.url ?? block.filename ?? block.path ?? "";
    case "list":
      return block.items.map((i) => `${i.label}: ${i.value}`).join(" | ");
    case "checklist":
      return block.items
        .filter((i) => i.checked)
        .map((i) => i.label)
        .join(" | ");
    case "empty":
    default:
      return "";
  }
}

export function blockQuestion(block: AnswerBlock): string {
  return block.question ?? "";
}

export type AnswerCsvRow = {
  estudante: string;
  codigo: string;
  turma: string;
  eletiva: string;
  modulo_numero: string;
  modulo: string;
  status_entrega: string;
  enviado_em: string;
  pilula_ordem: string;
  pilula: string;
  obrigatoriedade: string;
  pergunta: string;
  resposta: string;
  respondida: string;
};

export type StudentLabels = {
  name: string;
  code: string;
  turma: string;
  courseTitle: string;
};

export function buildAnswerRows(
  deliverables: DeliverableInbox[],
  pillsByModule: Record<string, PillForResolve[]>,
  labelFor: (d: DeliverableInbox) => StudentLabels,
): AnswerCsvRow[] {
  const rows: AnswerCsvRow[] = [];
  for (const d of deliverables) {
    const labels = labelFor(d);
    const pills = pillsByModule[d.module_id] ?? [];
    const content = (d.content ?? {}) as DeliverableContent;
    for (const pill of pills) {
      const resolved = resolvePill(pill, content);
      // pílulas puramente passivas sem nenhum bloco não geram linha
      if (resolved.state === "passiva" && resolved.blocks.length === 0) continue;
      for (const block of resolved.blocks) {
        const resposta = blockToText(block);
        rows.push({
          estudante: labels.name,
          codigo: labels.code,
          turma: labels.turma,
          eletiva: labels.courseTitle,
          modulo_numero: d.module ? String(d.module.number).padStart(2, "0") : "",
          modulo: d.module?.title ?? "",
          status_entrega:
            d.submitted_at === null && d.status === "rascunho" ? "rascunho" : d.status,
          enviado_em: d.submitted_at ?? "",
          pilula_ordem: String(resolved.order),
          pilula: resolved.title,
          obrigatoriedade: resolved.required ? "obrigatória" : "opcional",
          pergunta: blockQuestion(block),
          resposta,
          respondida: resposta.trim() ? "sim" : "não",
        });
      }
    }
  }
  return rows;
}

export function rowsToCsv(rows: AnswerCsvRow[]): string {
  const headers: (keyof AnswerCsvRow)[] = [
    "estudante",
    "codigo",
    "turma",
    "eletiva",
    "modulo_numero",
    "modulo",
    "status_entrega",
    "enviado_em",
    "pilula_ordem",
    "pilula",
    "obrigatoriedade",
    "pergunta",
    "resposta",
    "respondida",
  ];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
