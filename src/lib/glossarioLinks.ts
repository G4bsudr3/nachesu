import { GLOSSARIO, normalize } from "@/data/glossario";

/** regiões que não podem receber link: link markdown, código inline, url crua, imagem */
const PROTEGIDO = /(!?\[[^\]]*\]\([^)]*\)|`[^`]*`|https?:\/\/\S+)/g;

/** monta a lista de gatilhos (termo + sinônimos) apontando pro termo canônico */
function gatilhos(): { padrao: string; termo: string }[] {
  const lista: { padrao: string; termo: string }[] = [];
  for (const t of GLOSSARIO) {
    lista.push({ padrao: t.termo, termo: t.termo });
    for (const s of t.sinonimos ?? []) lista.push({ padrao: s, termo: t.termo });
  }
  // mais longo primeiro pra "economia circular" ganhar de "circular"
  return lista.sort((a, b) => b.padrao.length - a.padrao.length);
}

const GATILHOS = gatilhos();

function escapar(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** casa a palavra inteira, ignorando caixa e acento (compara por normalize) */
function acharPrimeira(texto: string, padrao: string): { inicio: number; fim: number } | null {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapar(padrao)})(?=[^\\p{L}\\p{N}]|$)`, "iud");
  const direto = re.exec(texto);
  if (direto) {
    const inicio = direto.index + direto[1].length;
    return { inicio, fim: inicio + direto[2].length };
  }
  // fallback sem acento: varre palavra a palavra
  const alvo = normalize(padrao);
  const janela = alvo.split(/\s+/).length;
  const tokens = [...texto.matchAll(/[\p{L}\p{N}'’-]+/gu)];
  for (let i = 0; i + janela <= tokens.length; i++) {
    const trecho = tokens.slice(i, i + janela);
    const bruto = texto.slice(
      trecho[0].index!,
      trecho[trecho.length - 1].index! + trecho[trecho.length - 1][0].length,
    );
    if (normalize(bruto) === alvo) {
      return { inicio: trecho[0].index!, fim: trecho[0].index! + bruto.length };
    }
  }
  return null;
}

/**
 * marca a primeira aparição de cada termo do glossário com link markdown
 * pro /app/glossario?q=<termo>. usadas = termos já linkados antes neste módulo.
 */
export function linkifyGlossario(markdown: string, usadas = new Set<string>()): string {
  if (!markdown) return markdown;

  return markdown
    .split("\n")
    .map((linha) => {
      // pula título, citação e bloco de código
      if (/^\s*(#{1,6}\s|>|```|\s{4,}\S)/.test(linha)) return linha;

      const partes = linha.split(PROTEGIDO);
      return partes
        .map((parte, i) => {
          if (i % 2 === 1) return parte; // região protegida
          let out = parte;
          for (const g of GATILHOS) {
            if (usadas.has(g.termo)) continue;
            const hit = acharPrimeira(out, g.padrao);
            if (!hit) continue;
            const texto = out.slice(hit.inicio, hit.fim);
            const href = `/app/glossario?q=${encodeURIComponent(g.termo)}`;
            out = `${out.slice(0, hit.inicio)}[${texto}](${href})${out.slice(hit.fim)}`;
            usadas.add(g.termo);
          }
          return out;
        })
        .join("");
    })
    .join("\n");
}
