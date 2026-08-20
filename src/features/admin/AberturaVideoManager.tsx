import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Schema = {
  type?: string;
  video_url?: string;
  transcript?: string;
  completion?: { type?: string; label?: string };
  [k: string]: unknown;
};

type AberturaRow = {
  module_id: string;
  module_number: number;
  pill_id: string | null;
  title: string;
  published: boolean;
  schema: Schema;
  /** coluna video_url da pílula: é onde a economia circular guarda o vídeo */
  video_url: string | null;
};

/** verdadeiro quando a pílula tem vídeo em qualquer um dos formatos usados */
export const rowHasVideo = (r: { schema: Schema; video_url: string | null }) =>
  !!(
    (r.video_url ?? "").trim() ||
    ((r.schema.video_url as string) ?? "").trim() ||
    ((r.schema.embed_url as string) ?? "").trim()
  );

interface Props {
  courseId: string;
  slug: string;
  moduleId: string;
  moduleNumber: number;
  accent: string;
}

const BUCKET = "pill-attachments";

/**
 * gestão da pílula de abertura (vídeo + transcrição) de cada módulo.
 * a pílula é publicada automaticamente quando existe vídeo, e volta a ficar
 * despublicada se o vídeo for removido. nenhum texto é gerado aqui:
 * transcrição e título vêm digitados pelo educador.
 */
export const AberturaVideoManager = ({ courseId, slug, moduleId, moduleNumber, accent }: Props) => {
  const qc = useQueryClient();
  const key = ["admin-aberturas", courseId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<AberturaRow[]> => {
      const { data: trails } = await supabase.from("trails").select("id").eq("course_id", courseId);
      const trailIds = (trails ?? []).map((t) => t.id);
      if (!trailIds.length) return [];
      const { data: mods } = await supabase
        .from("modules")
        .select("id, number")
        .in("trail_id", trailIds)
        .order("number");
      const modules = (mods ?? []) as { id: string; number: number }[];
      if (!modules.length) return [];
      const { data: pills } = await supabase
        .from("module_pills")
        .select("id, module_id, title, published, order_index, interaction_schema, video_url")
        .in("module_id", modules.map((m) => m.id))
        .order("order_index");
      const byModule = new Map<string, AberturaRow>();
      for (const p of (pills ?? []) as never[] as {
        id: string;
        module_id: string;
        title: string;
        published: boolean;
        interaction_schema: Schema | null;
        video_url: string | null;
      }[]) {
        const kind = p.interaction_schema?.type;
        const isVideoPill =
          kind === "video_with_transcript" ||
          kind === "video_embed" ||
          !!(p.video_url ?? "").trim();
        if (!isVideoPill) continue;
        if (byModule.has(p.module_id)) continue;
        const mod = modules.find((m) => m.id === p.module_id)!;
        byModule.set(p.module_id, {
          module_id: p.module_id,
          module_number: mod.number,
          pill_id: p.id,
          title: p.title,
          published: p.published,
          schema: p.interaction_schema ?? {},
          video_url: p.video_url,
        });
      }
      return modules.map(
        (m) =>
          byModule.get(m.id) ?? {
            module_id: m.id,
            module_number: m.number,
            pill_id: null,
            title: "",
            published: false,
            schema: {},
            video_url: null,
          },
      );
    },
  });

  const current = useMemo(
    () => data?.find((r) => r.module_id === moduleId) ?? null,
    [data, moduleId],
  );

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!current) return;
    setTitle(current.title ?? "");
    setTranscript((current.schema.transcript as string) ?? "");
    setVideoUrl(
      (current.schema.video_url as string) ||
        (current.schema.embed_url as string) ||
        current.video_url ||
        "",
    );

  }, [current?.pill_id, current?.module_id]);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/50">carregando aberturas…</p>;
  }
  if (!current?.pill_id) {
    return (
      <p className="text-sm text-perestroika-preto/60">
        este módulo ainda não tem pílula de abertura criada.
      </p>
    );
  }

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const path = `${slug}/modulo-${moduleNumber}/abertura-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setVideoUrl(pub.publicUrl);
      toast.success("vídeo enviado. clique em salvar pra publicar a abertura.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hasVideo = videoUrl.trim().length > 0;
      const nextSchema: Schema = {
        ...current.schema,
        type: "video_with_transcript",
        video_url: videoUrl.trim(),
        transcript: transcript,
      };
      const { error } = await supabase
        .from("module_pills")
        .update({
          title: title.trim() || current.title,
          interaction_schema: nextSchema as never,
          published: hasVideo,
        })
        .eq("id", current.pill_id!);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["admin-modulo-detalhe"] });
      toast.success(hasVideo ? "abertura salva e publicada" : "salvo. sem vídeo, segue despublicada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "não deu pra salvar");
    } finally {
      setSaving(false);
    }
  };

  const semVideo = (data ?? []).filter((r) => !rowHasVideo(r));

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5 space-y-4">
        <header className="flex items-center gap-2">
          <Video className="w-4 h-4" style={{ color: accent }} />
          <h3 className="font-display uppercase text-2xl leading-none">
            vídeo de abertura do módulo {String(moduleNumber).padStart(2, "0")}
          </h3>
        </header>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1">
            título da pílula
          </label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1">
            arquivo de vídeo
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 text-[11px] uppercase tracking-wide text-perestroika-bege cursor-pointer min-h-[40px]">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              enviar vídeo
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
            {videoUrl && (
              <button
                type="button"
                onClick={() => setVideoUrl("")}
                className="text-[11px] uppercase tracking-wide underline text-perestroika-preto/60"
              >
                remover vídeo
              </button>
            )}
          </div>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="ou cole uma url de vídeo"
            className="mt-2"
          />
          {videoUrl && (
            <video src={videoUrl} controls playsInline className="mt-3 w-full max-w-md rounded-xl bg-black" />
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1">
            transcrição
          </label>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            placeholder="cole aqui a transcrição do vídeo"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] uppercase tracking-wide text-perestroika-bege disabled:opacity-50 min-h-[40px]"
            style={{ backgroundColor: accent }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            salvar abertura
          </button>
          <span className="text-[11px] text-perestroika-preto/55">
            {videoUrl.trim() ? "com vídeo: fica publicada pro estudante" : "sem vídeo: não aparece pro estudante"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5">
        <h3 className="font-display uppercase text-xl leading-none mb-1">
          aberturas de todos os módulos
        </h3>
        <p className="text-[11px] text-perestroika-preto/55 mb-4">
          {semVideo.length} de {(data ?? []).length} ainda sem vídeo
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {(data ?? []).map((r) => {
            const has = rowHasVideo(r);
            return (
              <li key={r.module_id}>
                <Link
                  to={`/admin/eletiva/${slug}/modulo/${r.module_number}`}
                  className={`block rounded-xl border-2 px-3 py-2.5 ${
                    has
                      ? "border-perestroika-preto/15 bg-perestroika-bege"
                      : "border-rose-300 bg-rose-50"
                  } ${r.module_id === moduleId ? "ring-2 ring-perestroika-preto" : ""}`}
                >
                  <span className="font-display text-2xl leading-none tabular-nums">
                    {String(r.module_number).padStart(2, "0")}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide mt-1 text-perestroika-preto/60">
                    {has ? "com vídeo" : "sem vídeo"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
