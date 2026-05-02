import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2, X, FileAudio, ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EvidenceKind = "none" | "file" | "link";

export type EvidenceValue = {
  evidence_kind: EvidenceKind;
  evidence_link?: string;
  evidence_path?: string;
  evidence_name?: string;
};

interface Props {
  itemId: string;
  value: EvidenceValue;
  onChange: (next: EvidenceValue) => void;
  accent: string;
  maxMb?: number;
  /** quando true, renderiza num layout vertical mais compacto pra cards finais */
  compact?: boolean;
  /** path no bucket pra montar preview/link público assinado quando evidence_kind === "file" */
  previewUrl?: string | null;
}

const BUCKET = "radar-evidences";

/**
 * EvidenceUploader — componente reusável de evidência (foto/áudio/link).
 *
 * usado em duas telas: na pílula radar (inline na linha do item) e na tela
 * final pós-aula (card consolidado, dá segunda chance pra preencher quem
 * faltou). respeita rls do bucket privado `radar-evidences`: path sempre
 * começa com `${user.id}/`.
 */
export function EvidenceUploader({
  itemId,
  value,
  onChange,
  accent,
  maxMb = 10,
  compact = false,
  previewUrl,
}: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    if (!user) {
      const m = "precisa estar logado pra subir evidência.";
      setErrorMsg(m);
      toast.error(m);
      return;
    }
    const allowed = /^(image\/|audio\/)/.test(file.type);
    if (!allowed) {
      const m = "só foto ou áudio por enquanto.";
      setErrorMsg(m);
      toast.error(m);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      const m = `arquivo passa de ${maxMb}mb.`;
      setErrorMsg(m);
      toast.error(m);
      return;
    }
    setUploading(true);
    setProgressMsg("subindo...");
    try {
      // se já tinha um path antigo pra esse item, remove pra não acumular lixo
      if (value.evidence_path) {
        await supabase.storage.from(BUCKET).remove([value.evidence_path]).catch(() => {});
      }
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      // path prefixado por user.id pra bater com a rls do bucket privado
      const path = `${user.id}/${itemId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });
      if (error) throw error;
      onChange({
        evidence_kind: "file",
        evidence_path: path,
        evidence_name: file.name,
        evidence_link: undefined,
      });
      setProgressMsg("evidência salva.");
      toast.success("evidência salva.");
      setTimeout(() => setProgressMsg(null), 1500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "erro no upload";
      // rls volta mensagens técnicas; traduz pra humano
      const msg = /row-level security|not authorized|permission/i.test(raw)
        ? "sem permissão pra subir aqui. faz login de novo."
        : raw;
      setErrorMsg(msg);
      setProgressMsg(null);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const clear = async () => {
    if (value.evidence_path) {
      await supabase.storage.from(BUCKET).remove([value.evidence_path]).catch(() => {});
    }
    onChange({ evidence_kind: "none", evidence_link: undefined, evidence_path: undefined, evidence_name: undefined });
  };

  const isImage = value.evidence_name?.match(/\.(jpe?g|png|webp|gif)$/i);
  const isAudio = value.evidence_name?.match(/\.(mp3|m4a|ogg|wav)$/i);

  // estado: já tem evidência válida → mostra "chip" com remover
  if (value.evidence_kind === "file" && value.evidence_path) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "flex-col items-start" : "flex-wrap"}`}>
        <div
          className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-body text-xs"
          style={{ borderColor: accent, backgroundColor: `${accent}10`, color: "#202124" }}
        >
          {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : isAudio ? <FileAudio className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
          <span className="max-w-[180px] truncate">{value.evidence_name ?? "arquivo enviado"}</span>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-center gap-1"
              aria-label="abrir evidência em nova aba"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={clear}
            className="hover:opacity-70"
            aria-label="remover evidência"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (value.evidence_kind === "link" && value.evidence_link) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "flex-col items-start" : "flex-wrap"}`}>
        <div
          className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-body text-xs"
          style={{ borderColor: accent, backgroundColor: `${accent}10`, color: "#202124" }}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <a
            href={value.evidence_link}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[200px] truncate hover:underline"
          >
            {value.evidence_link}
          </a>
          <button
            type="button"
            onClick={clear}
            className="hover:opacity-70"
            aria-label="remover link"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // estado: vazio → mostra opções de upload + link
  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "items-stretch" : ""}`}>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "flex-col items-stretch" : ""}`}>
        <label
          className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-body text-xs cursor-pointer transition-colors ${
            errorMsg ? "border-[#fd4644]" : "border-perestroika-preto/20 hover:border-perestroika-preto/50"
          } ${uploading ? "opacity-70 cursor-wait" : ""}`}
          aria-busy={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {uploading ? "subindo..." : "subir foto/áudio"}
          <input
            type="file"
            accept="image/*,audio/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
            disabled={uploading}
          />
        </label>
        {!compact && <span className="font-body text-[11px] text-perestroika-preto/50">ou</span>}
        <div className={`flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/20 px-3 py-1 ${compact ? "w-full" : "flex-1 min-w-[160px]"}`}>
          <LinkIcon className="h-3.5 w-3.5 text-perestroika-preto/55 flex-shrink-0" aria-hidden="true" />
          <input
            type="url"
            value={value.evidence_link ?? ""}
            onChange={(e) => {
              setErrorMsg(null);
              onChange({
                evidence_kind: e.target.value ? "link" : "none",
                evidence_link: e.target.value,
                evidence_path: undefined,
                evidence_name: undefined,
              });
            }}
            placeholder="cole link"
            className="w-full bg-transparent font-body text-xs focus:outline-none"
            aria-label="link como evidência"
            disabled={uploading}
          />
        </div>
      </div>
      {(progressMsg || errorMsg) && (
        <p
          role={errorMsg ? "alert" : "status"}
          aria-live="polite"
          className="font-body text-[11px]"
          style={{ color: errorMsg ? "#fd4644" : "#75BF9C" }}
        >
          {errorMsg ?? progressMsg}
        </p>
      )}
    </div>
  );
}
