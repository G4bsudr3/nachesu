import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import {
  NachesCertificate,
  NACHES_CERTIFICATE_DIMENSIONS,
  type NachesCertificateProps,
} from "./NachesCertificate";

export const certificateCode = (courseSlug: string, userId: string) =>
  `NU-${courseSlug.startsWith("economia") ? "EC" : "IA"}-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const slugifyName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** converte o nó do certificado em PDF A4 paisagem. */
export async function nodeToCertificatePdf(node: HTMLElement, paper: string): Promise<Blob> {
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    backgroundColor: paper,
    width: NACHES_CERTIFICATE_DIMENSIONS.width,
    height: NACHES_CERTIFICATE_DIMENSIONS.height,
    cacheBust: true,
  });
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = NACHES_CERTIFICATE_DIMENSIONS.width / NACHES_CERTIFICATE_DIMENSIONS.height;
  let w = pageW;
  let h = pageH;
  if (ratio > pageW / pageH) h = pageW / ratio;
  else w = pageH * ratio;
  pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
  return pdf.output("blob");
}

/** monta o certificado fora da tela, gera o PDF e desmonta. usado no lote do admin. */
export async function renderNachesCertificatePdf(props: NachesCertificateProps): Promise<Blob> {
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    top: "-20000px",
    left: "-20000px",
    width: `${NACHES_CERTIFICATE_DIMENSIONS.width}px`,
    height: `${NACHES_CERTIFICATE_DIMENSIONS.height}px`,
    pointerEvents: "none",
  });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<NachesCertificate {...props} />));
    const node = host.firstElementChild as HTMLElement;
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => null))));
    return await nodeToCertificatePdf(node, props.paperColor ?? "#f2e4d8");
  } finally {
    root.unmount();
    host.remove();
  }
}
