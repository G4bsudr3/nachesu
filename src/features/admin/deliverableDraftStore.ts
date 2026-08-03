// rascunho local de correção por entrega.
// guarda o que o educador escreveu (feedback, tags, nota, resposta) enquanto
// ele navega entre entregas dentro de /admin/entregas. nada aqui substitui o
// banco: é só uma rede de segurança pra não perder texto ao trocar de entrega,
// fechar o drawer sem querer ou recarregar a página.

import { nsGet, nsSet, nsRemove } from "@/lib/nsKey";

export interface DeliverableDraft {
  feedback: string;
  tags: string[];
  score: string;
  reply: string;
  savedAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias
const storageKey = (id: string) => `entrega-draft.${id}`;

export const isDraftEmpty = (d: Omit<DeliverableDraft, "savedAt">) =>
  d.feedback.trim() === "" && d.reply.trim() === "" && d.score.trim() === "" && d.tags.length === 0;

export const loadDeliverableDraft = (id: string): DeliverableDraft | null => {
  const raw = nsGet(storageKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DeliverableDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > TTL_MS) {
      nsRemove(storageKey(id));
      return null;
    }
    return {
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      score: typeof parsed.score === "string" ? parsed.score : "",
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
};

export const saveDeliverableDraft = (id: string, draft: Omit<DeliverableDraft, "savedAt">) => {
  if (isDraftEmpty(draft)) {
    nsRemove(storageKey(id));
    return;
  }
  nsSet(storageKey(id), JSON.stringify({ ...draft, savedAt: Date.now() }));
};

export const clearDeliverableDraft = (id: string) => nsRemove(storageKey(id));
