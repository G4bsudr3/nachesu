// heurística de gênero por primeiro nome (PT-BR).
// devolve "f" | "m" | "n" (n = neutro/desconhecido).
// uso: na UI da carta (flexionar tokens) e na edge function (concordância no prompt).

export type Gender = "f" | "m" | "n";

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const firstName = (full: string | null | undefined): string => {
  if (!full) return "";
  return stripAccents(full).split(/\s+/)[0] ?? "";
};

// nomes femininos que NÃO terminam em "a"
const F_EXCEPTIONS = new Set([
  "beatriz", "alice", "iris", "ines", "carmen", "miriam", "miryam", "raquel",
  "isabel", "abigail", "ester", "esther", "judith", "ruth", "marlen", "marlene",
  "helen", "jasmin", "yasmin", "yasmim", "carol", "manu", "manuh", "liv", "mel",
  "may", "mey", "kim", "lou", "fran", "nicol", "sol", "estefani", "estefany",
  "kelly", "wendy", "lulu", "ju", "biel", "gabi", "duda", "dudah", "dani",
  "lis", "agnes", "doris", "eunice", "maite", "maitê", "miriã", "noemi",
  "stefanie", "rebecca",
]);

// nomes masculinos que terminam em "a" ou ambíguos
const M_EXCEPTIONS = new Set([
  "joshua", "luca", "noah", "joah", "andrea", "andre", "ravel", "ravi", "kaua",
  "kauã", "thiagao", "iuri", "yuri", "elias", "tobias", "matias", "isaias",
  "jeremias", "josue", "josué", "barnaba", "akira", "yuma", "ezra", "issa",
  "kaleb", "caleb", "yoga", "kenia", "deva",
]);

const F_SUFFIXES = ["ana", "ina", "ela", "ette", "elle", "ice", "ila", "ila", "ssa", "ena"];
const M_SUFFIXES = ["son", "ton", "ilson", "anderson", "marcos", "berto", "ardo"];

export const detectGender = (fullName: string | null | undefined): Gender => {
  const name = firstName(fullName);
  if (!name) return "n";

  if (F_EXCEPTIONS.has(name)) return "f";
  if (M_EXCEPTIONS.has(name)) return "m";

  for (const suf of F_SUFFIXES) {
    if (name.endsWith(suf)) return "f";
  }
  for (const suf of M_SUFFIXES) {
    if (name.endsWith(suf)) return "m";
  }

  const last = name.slice(-1);
  if (last === "a") return "f";
  if (last === "o") return "m";
  if (["e", "i", "u"].includes(last)) return "n";
  // consoante final → tende a ser masculino em PT
  return "m";
};

/** primeiro nome em formato display (preserva acentos, capitaliza) */
export const firstNameDisplay = (full: string | null | undefined): string => {
  if (!full) return "";
  const first = full.trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};
