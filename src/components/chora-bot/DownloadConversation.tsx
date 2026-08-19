import { useState } from "react";
import { Download, FileText, FileDown, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  messages: Msg[];
  defaultTitle: string;
}

const formatDateBR = (d: Date) =>
  d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const sanitizeFilename = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60) || "tutor-ia";

export const DownloadConversation = ({ messages, defaultTitle }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [editing, setEditing] = useState(false);

  // se a conversa muda e o usuário não tá editando, atualiza
  const effectiveTitle = title.trim() || defaultTitle;

  const buildHeader = () => {
    const date = formatDateBR(new Date());
    return { title: effectiveTitle, date };
  };

  const downloadTxt = () => {
    if (messages.length === 0) {
      toast.error("conversa vazia, nada pra baixar");
      return;
    }
    const { title: t, date } = buildHeader();
    const lines: string[] = [];
    lines.push(t);
    lines.push("=".repeat(Math.min(t.length, 60)));
    lines.push(`exportado em ${date}`);
    lines.push("tutor IA · sebrae eletiva");
    lines.push("");
    lines.push("");
    messages.forEach((m) => {
      lines.push(m.role === "user" ? "tu:" : "tutor:");
      lines.push(m.content);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(t)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("texto salvo");
    setOpen(false);
  };

  const downloadPdf = async () => {
    if (messages.length === 0) {
      toast.error("conversa vazia, nada pra baixar");
      return;
    }
    const { title: t, date } = buildHeader();
    // jsPDF sob demanda (~163KB gzip): só carrega ao baixar a conversa
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const marginTop = 56;
    const marginBottom = 56;
    const contentW = pageW - marginX * 2;
    let y = marginTop;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
    };

    // título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(9, 9, 9);
    const titleLines = doc.splitTextToSize(t, contentW);
    titleLines.forEach((line: string) => {
      ensureSpace(24);
      doc.text(line, marginX, y);
      y += 24;
    });

    // metadata
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`exportado em ${date}  ·  tutor IA`, marginX, y);
    y += 18;

    // separador
    doc.setDrawColor(220, 220, 220);
    doc.line(marginX, y, pageW - marginX, y);
    y += 22;

    // mensagens
    messages.forEach((m) => {
      const isUser = m.role === "user";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(isUser ? 111 : 254, isUser ? 119 : 123, isUser ? 252 : 2);
      ensureSpace(16);
      doc.text(isUser ? "tu" : "tutor", marginX, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(9, 9, 9);
      const bodyLines = doc.splitTextToSize(m.content, contentW);
      bodyLines.forEach((line: string) => {
        ensureSpace(16);
        doc.text(line, marginX, y);
        y += 15;
      });
      y += 12;
    });

    // numeração de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 160);
      doc.text(`${i} / ${pageCount}`, pageW - marginX, pageH - 24, { align: "right" });
      doc.text("chora lovable hub", marginX, pageH - 24);
    }

    doc.save(`${sanitizeFilename(t)}.pdf`);
    toast.success("pdf salvo");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="baixar conversa"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-perestroika-preto/15 hover:border-perestroika-preto/40 hover:bg-perestroika-preto/5 transition-colors text-perestroika-preto/70 hover:text-perestroika-preto"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="font-display uppercase text-[10px] tracking-[0.2em]">baixar</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 bg-perestroika-bege border-perestroika-preto/15 p-2"
      >
        <p className="px-2 pt-1 pb-1.5 font-display uppercase text-[9px] tracking-[0.25em] text-perestroika-preto/50">
          título do arquivo
        </p>
        <div className="px-1 pb-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setEditing(false);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setTitle(defaultTitle);
                    setEditing(false);
                  }
                }}
                className="h-8 text-sm font-body bg-perestroika-bege"
                placeholder="dá um nome"
              />
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded hover:bg-perestroika-preto/5 text-perestroika-preto/70"
                aria-label="confirmar título"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setTitle(defaultTitle);
                  setEditing(false);
                }}
                className="p-1.5 rounded hover:bg-perestroika-preto/5 text-perestroika-preto/70"
                aria-label="cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-perestroika-preto/5 text-sm font-body text-perestroika-preto truncate border border-transparent hover:border-perestroika-preto/10"
              title="clica pra editar"
            >
              {effectiveTitle}
            </button>
          )}
          <p className="px-2 pt-1.5 text-[10px] text-perestroika-preto/40 font-body">
            {formatDateBR(new Date())}
          </p>
        </div>
        <div className="h-px bg-perestroika-preto/10 my-1" />
        <button
          onClick={downloadPdf}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-body text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors"
        >
          <FileDown className="w-4 h-4" />
          baixar como pdf
        </button>
        <button
          onClick={downloadTxt}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-body text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors"
        >
          <FileText className="w-4 h-4" />
          baixar como texto
        </button>
      </PopoverContent>
    </Popover>
  );
};

