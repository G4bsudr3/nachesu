import { useSyncExternalStore, useCallback } from "react";

const KEY = "eletiva:active-slug";

// store global no escopo do módulo: garante que toda instância do hook
// veja a mesma slug e re-renderize quando alguém chamar setSlug.
let currentSlug: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return currentSlug;
}

function getServerSnapshot(): string | null {
  return null;
}

// sincroniza mudanças vindas de OUTRAS abas
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== KEY) return;
    currentSlug = e.newValue;
    emit();
  });
}

export function setActiveSlug(next: string | null) {
  if (typeof window !== "undefined") {
    if (next) window.localStorage.setItem(KEY, next);
    else window.localStorage.removeItem(KEY);
  }
  currentSlug = next;
  emit();
}

/**
 * slug da eletiva "atual" escolhida pelo aluno (persistido em localStorage).
 * compartilhada entre todos os consumidores via store de módulo, então
 * `setSlug` em qualquer lugar re-renderiza tudo (dashboard, switcher,
 * EletivaCard, Trilhas, useEletivaExtras, etc.).
 */
export function useActiveEletiva() {
  const slug = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setSlug = useCallback((next: string | null) => {
    setActiveSlug(next);
  }, []);
  return { slug, setSlug };
}
