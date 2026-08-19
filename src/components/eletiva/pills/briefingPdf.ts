export type BriefingData = {
  titulo?: string;
  hmw?: string;
  fluxo_principal?: string;
  fluxo_secundario?: string;
  evidencias_resumo?: string[];
  atores_ganha?: string;
  atores_perde?: string;
  justificativa?: string;
  aluno_nome?: string;
  data_iso?: string;
};

const FLUXOS: Record<string, string> = {
  materiais: "Materiais e Compras",
  alimentacao: "Alimentação",
  energia: "Energia e Clima",
  agua: "Água",
  mobilidade: "Mobilidade e Entorno",
  tecnologia: "Tecnologia e Eletrônicos",
};

const CREME = "#F5EEE1";
const LARANJA = "#F25E3D";
const PRETO = "#1A1A1A";
const CINZA = "#8A8375";

function fluxoLabel(k?: string) {
  if (!k) return "—";
  return FLUXOS[k] ?? k;
}

/**
 * Gera o PDF do briefing da aula 5 (economia circular).
 * Layout A4 retrato, 1 página, paleta Duduo. Devolve um Blob pronto pra download ou upload.
 * jsPDF é importado sob demanda (~163KB gzip) pra não pesar na rota de módulo —
 * só carrega quando o aluno realmente exporta o PDF.
 */
export async function generateBriefingPdf(data: BriefingData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = 210;
  const h = 297;

  // fundo creme
  doc.setFillColor(CREME);
  doc.rect(0, 0, w, h, "F");

  // barra lateral laranja com doodles
  doc.setFillColor(LARANJA);
  doc.rect(0, 0, 12, h, "F");

  // ribbon topo
  doc.setFillColor(PRETO);
  doc.rect(12, 0, w - 12, 22, "F");
  doc.setTextColor(CREME);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BRIEFING DO PROJETO · TRILHA 1 ENXERGAR", 18, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const dataStr = new Date(data.data_iso ?? Date.now()).toLocaleDateString("pt-BR");
  doc.text(`ECONOMIA CIRCULAR & NEGÓCIOS REGENERATIVOS · ${dataStr}`, 18, 19);

  // título do projeto
  let y = 34;
  doc.setTextColor(PRETO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const tituloLines = doc.splitTextToSize(data.titulo || "(sem título)", w - 30);
  doc.text(tituloLines, 18, y);
  y += tituloLines.length * 8 + 2;

  if (data.aluno_nome) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(CINZA);
    doc.text(`por ${data.aluno_nome}`, 18, y);
    y += 6;
  }

  // divisor laranja
  doc.setDrawColor(LARANJA);
  doc.setLineWidth(0.8);
  doc.line(18, y, w - 12, y);
  y += 8;

  // helper de seção
  const section = (titulo: string, body: string | string[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(LARANJA);
    doc.text(titulo.toUpperCase(), 18, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(PRETO);
    const arr = Array.isArray(body) ? body : [body];
    arr.forEach((line) => {
      const lines = doc.splitTextToSize(line || "—", w - 30);
      doc.text(lines, 18, y);
      y += lines.length * 5;
    });
    y += 5;
  };

  section("1 · problema em formato HMW", data.hmw || "(preencher)");
  section(
    "2 · fluxo principal",
    `${fluxoLabel(data.fluxo_principal)}${
      data.fluxo_secundario ? `   •   secundário: ${fluxoLabel(data.fluxo_secundario)}` : ""
    }`,
  );

  const evs = (data.evidencias_resumo ?? []).filter((e) => (e ?? "").trim().length > 0);
  section(
    "3 · evidências que sustentam",
    evs.length > 0 ? evs.map((e, i) => `• ${e}`) : ["(nenhuma evidência registrada)"],
  );

  section("4 · quem ganha vs quem perde", [
    `ganha: ${data.atores_ganha || "—"}`,
    `perde: ${data.atores_perde || "—"}`,
  ]);

  section("5 · por que eu", data.justificativa || "—");

  // rodapé
  doc.setFillColor(PRETO);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setTextColor(CREME);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NACHESU · ELETIVA ECONOMIA CIRCULAR · ENCONTRO 5 · FECHAMENTO DA TRILHA 1", 18, h - 4.5);

  return doc.output("blob");
}
