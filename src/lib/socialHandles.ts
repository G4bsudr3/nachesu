// utils pra normalizar handles de instagram e linkedin
// regra: aceita o que o usuário digitar (url completa, @handle, só handle)
// e devolve a forma canônica que vai pro banco

const IG_VALID = /^[a-z0-9._]{1,30}$/;

export function normalizeInstagram(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;

  // tira url completa
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  // tira @
  s = s.replace(/^@+/, "");
  // pega só primeira "palavra" (pessoa às vezes cola descrição depois)
  s = s.split(/\s|\?|\//)[0] ?? "";
  s = s.toLowerCase();

  if (!s) return null;
  if (!IG_VALID.test(s)) return null;
  // descarta lixo comum
  if (["naopossuo", "nao", "nada", "n/a", "na"].includes(s)) return null;
  return s;
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}

export function normalizeLinkedin(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s || s.length < 2) return null;

  // url completa
  if (/^https?:\/\//i.test(s)) return s;
  // linkedin.com/...
  if (/^(www\.)?linkedin\./i.test(s)) return `https://${s.replace(/^www\./, "www.")}`;
  // só handle (alfanumérico, hífen, underscore, ponto)
  if (/^[A-Za-z0-9\-_./]+$/.test(s)) {
    const h = s.replace(/^\/+|\/+$/g, "");
    return `https://www.linkedin.com/in/${h}`;
  }
  return null;
}

export function linkedinDisplay(url: string): string {
  // mostra só o handle, não a url inteira
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // /in/handle ou /company/x
    const idx = parts.indexOf("in");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}
