import { useState } from "react";
import { Share2, Download, Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CartaDownloadDialog } from "./CartaDownloadDialog";
import type { Archetype } from "./cartaTokens";

interface CartaActionsProps {
  shareToken: string | null;
  imageUrl: string | null;
  archetype: string | null;
  nickname: string | null;
}

/** botões de compartilhar (link público) e baixar imagem da carta.
 * usado no rodapé do CartaCompleta em /app/carta. */
export const CartaActions = ({ shareToken, imageUrl, archetype, nickname }: CartaActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingRaw, setDownloadingRaw] = useState(false);

  // url pública e bonita da carta no domínio do hub.
  // crawlers (whats, twitter) buscam OG tags estáticas do index.html — preview básico.
  // pra preview rico por arquétipo, futuro: SSR ou middleware que detecta user-agent.
  const humanUrl = shareToken ? `${window.location.origin}/carta/${shareToken}` : null;
  const shareText = `descobri meu arquétipo de builder no chŏra lovable: ${archetype ?? ""}. olha a carta que o frattz escreveu pra mim 👇`;

  const handleShare = async () => {
    if (!humanUrl) {
      toast.error("link de compartilhamento ainda não disponível");
      return;
    }
    // web share api (mobile / share sheet nativo)
    if (navigator.share) {
      try {
        await navigator.share({ title: "minha carta de builder", text: shareText, url: humanUrl });
        return;
      } catch {
        // usuário cancelou, segue pro fallback
      }
    }
    // fallback desktop: copia link
    try {
      await navigator.clipboard.writeText(humanUrl);
      setCopied(true);
      toast.success("link copiado, cola no insta ou whats");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("não consegui copiar, tenta de novo");
    }
  };

  // cópia do link humano direto (sem passar pela edge function),
  // pra quem prefere uma url limpa /carta/:token
  const handleCopyHuman = async () => {
    if (!humanUrl) return;
    try {
      await navigator.clipboard.writeText(humanUrl);
      setCopied(true);
      toast.success("link curto copiado");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("não consegui copiar, tenta de novo");
    }
  };

  const handleDownload = async () => {
    // caminho preferido: abre modal de preview com TarotCard
    if (archetype) {
      setPreviewOpen(true);
      return;
    }

    // fallback: sem archetype, baixa só a arte crua (image_url) direto
    if (!imageUrl) {
      toast.error("imagem da carta ainda não foi gerada. pede pro frattz no whats.");
      return;
    }
    setDownloadingRaw(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carta-${nickname ?? "builder"}-chora-lovable.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("baixou (versão simples). agora posta nos stories 🔥");
    } catch {
      toast.error("deu ruim no download, tenta de novo");
    } finally {
      setDownloadingRaw(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 w-full">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-perestroika-preto text-perestroika-bege text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? "copiado" : "compartilhar"}
        </button>

        <button
          onClick={handleDownload}
          disabled={downloadingRaw}
          className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full border-2 border-perestroika-preto text-perestroika-preto text-sm uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          {downloadingRaw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadingRaw ? "baixando…" : "baixar imagem"}
        </button>

        {humanUrl && (
          <button
            onClick={handleCopyHuman}
            className="ml-auto inline-flex items-center gap-2 text-xs text-perestroika-preto/50 hover:text-perestroika-preto/80 transition-colors"
            aria-label="copiar link direto"
            title="copia o link direto sem passar pela edge function"
          >
            <Copy className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{humanUrl.replace(/^https?:\/\//, "")}</span>
          </button>
        )}
      </div>

      {archetype && (
        <CartaDownloadDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          archetype={archetype as Archetype}
          imageUrl={imageUrl}
          nickname={nickname}
        />
      )}
    </>
  );
};
