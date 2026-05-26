// helper de namespace pra localStorage/sessionStorage.
// prefixo atual: "nachesu.". leitura com fallback transparente em "chora." pra
// não invalidar dados de sessões antigas. usar sempre via nsGet/nsSet.

const NEW_PREFIX = "nachesu.";
const LEGACY_PREFIX = "chora.";

export const nsKey = (name: string) => `${NEW_PREFIX}${name}`;
export const nsLegacyKey = (name: string) => `${LEGACY_PREFIX}${name}`;

type Storage = "local" | "session";

const store = (kind: Storage) =>
  kind === "session" ? window.sessionStorage : window.localStorage;

/** lê valor preferindo a chave nova; cai pra legada se ausente e migra. */
export const nsGet = (name: string, kind: Storage = "local"): string | null => {
  try {
    const s = store(kind);
    const newVal = s.getItem(nsKey(name));
    if (newVal !== null) return newVal;
    const legacy = s.getItem(nsLegacyKey(name));
    if (legacy !== null) {
      // migra de forma transparente
      try { s.setItem(nsKey(name), legacy); } catch { /* noop */ }
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
};

export const nsSet = (name: string, value: string, kind: Storage = "local") => {
  try { store(kind).setItem(nsKey(name), value); } catch { /* noop */ }
};

export const nsRemove = (name: string, kind: Storage = "local") => {
  try {
    const s = store(kind);
    s.removeItem(nsKey(name));
    s.removeItem(nsLegacyKey(name));
  } catch { /* noop */ }
};
