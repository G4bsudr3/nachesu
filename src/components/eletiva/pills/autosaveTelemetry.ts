// telemetria leve de autosave por estudante.
// vive no client (memória + localStorage). serve pro estudante ver o próprio
// estado em tempo real e pro admin (quando está logado como estudante de teste
// ou quando o evento é exposto via console) acompanhar tentativas e falhas.

export type AutosaveEvent = {
  id: string;
  userId: string;
  moduleId: string;
  field: string;
  state: "saving" | "saved" | "error" | "retry";
  attempt: number;
  at: number; // ms epoch
  error?: string;
};

export type AutosaveFieldStatus = {
  state: "idle" | "saving" | "saved" | "error" | "retry";
  attempts: number;
  lastSavedAt: number | null;
  lastError: string | null;
  nextRetryAt: number | null;
};

const STORAGE_KEY = "nachesu.autosave.events.v1";
const MAX_EVENTS = 200;

type Listener = (events: AutosaveEvent[]) => void;
const listeners = new Set<Listener>();
let events: AutosaveEvent[] = [];

const loadFromStorage = () => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) events = JSON.parse(raw) as AutosaveEvent[];
  } catch {
    events = [];
  }
};

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // quota cheia, ignora
  }
};

loadFromStorage();

export const recordAutosaveEvent = (ev: Omit<AutosaveEvent, "id" | "at">) => {
  const event: AutosaveEvent = {
    ...ev,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
  };
  events = [...events.slice(-MAX_EVENTS + 1), event];
  persist();
  listeners.forEach((l) => l(events));
  // também sai no console pra rastro fácil em suporte
  if (event.state === "error" || event.state === "retry") {
    // eslint-disable-next-line no-console
    console.warn("[autosave]", event.state, event);
  }
  return event;
};

export const subscribeAutosaveEvents = (listener: Listener) => {
  listeners.add(listener);
  listener(events);
  return () => {
    listeners.delete(listener);
  };
};

export const getAutosaveEvents = () => events.slice();

export const clearAutosaveEvents = () => {
  events = [];
  persist();
  listeners.forEach((l) => l(events));
};
