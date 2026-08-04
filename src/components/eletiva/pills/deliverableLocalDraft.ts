// espelho local do rascunho do exercício.
// serve de rede de segurança: tudo que está pra ser salvo no banco é gravado
// antes em localStorage. se o save falhar, a aba fechar ou a pessoa recarregar
// antes do debounce, o conteúdo volta no próximo load e é reenviado.

import { nsGet, nsRemove, nsSet } from "@/lib/nsKey";

export type LocalDraft = {
  content: Record<string, unknown>;
  updatedAt: number;
};

const key = (userId: string, moduleId: string) => `deliverable-draft:${userId}:${moduleId}`;

export const readLocalDraft = (userId?: string, moduleId?: string): LocalDraft | null => {
  if (!userId || !moduleId) return null;
  try {
    const raw = nsGet(key(userId, moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.content) return null;
    return parsed;
  } catch {
    return null;
  }
};

/** grava (merge raso) um patch no espelho local. */
export const writeLocalDraft = (
  userId: string | undefined,
  moduleId: string | undefined,
  patch: Record<string, unknown>,
) => {
  if (!userId || !moduleId) return;
  const prev = readLocalDraft(userId, moduleId);
  const next: LocalDraft = {
    content: { ...(prev?.content ?? {}), ...patch },
    updatedAt: Date.now(),
  };
  try {
    nsSet(key(userId, moduleId), JSON.stringify(next));
  } catch {
    // storage cheio ou modo privado: autosave no banco segue valendo
  }
};

export const clearLocalDraft = (userId?: string, moduleId?: string) => {
  if (!userId || !moduleId) return;
  nsRemove(key(userId, moduleId));
};
