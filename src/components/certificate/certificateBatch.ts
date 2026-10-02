import { renderNachesCertificatePdf, slugifyName } from "./renderNachesCertificatePdf";
import type { NachesCertificateProps } from "./NachesCertificate";

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export type BatchItem = {
  key: string;
  nome: string;
  ra: string | null;
  turma: string | null;
  props: NachesCertificateProps;
  /** colunas extras da planilha, na ordem de `csvHeader` */
  csv: string[];
};

export const certificateFileName = (nome: string, ra: string | null) =>
  `${slugifyName(nome)}${ra ? `-${ra}` : ""}.pdf`;

/** gera os PDFs em série (não trava a aba), monta o zip por turma + lista.csv. */
export async function buildCertificatesZip(
  items: BatchItem[],
  csvHeader: string[],
  onProgress: (done: number, total: number) => void,
): Promise<{ blob: Blob; failed: string[] }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const failed: string[] = [];
  const rows = [csvHeader.map(csvCell).join(",")];
  onProgress(0, items.length);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const pdf = await renderNachesCertificatePdf(it.props);
      zip.folder(it.turma ?? "sem-turma")!.file(certificateFileName(it.nome, it.ra), pdf);
      rows.push(it.csv.map(csvCell).join(","));
    } catch {
      failed.push(it.nome);
    }
    onProgress(i + 1, items.length);
  }
  zip.file("lista.csv", "\uFEFF" + rows.join("\n"));
  return { blob: await zip.generateAsync({ type: "blob" }), failed };
}
