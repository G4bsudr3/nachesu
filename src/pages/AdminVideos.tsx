import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CheckStatus =
  | "ok"
  | "divergente"
  | "fora_do_ar"
  | "sem_video"
  | "ficha_incompleta"
  | "arquivo_proprio"
  | "erro";

type CheckItem = {
  pill_id: string;
  course_slug: string;
  course_title: string;
  module_number: number;
  module_title: string;
  order_index: number;
  pill_title: string;
  published: boolean;
  is_bonus: boolean;
  link: string | null;
  db_title: string | null;
  db_channel: string | null;
  real_title: string | null;
  real_channel: string | null;
  title_mismatch?: boolean;
  channel_mismatch?: boolean;
  status: CheckStatus;
};

const STATUS_META: Record<
  CheckStatus,
  { label: string; tone: "bad" | "warn" | "good" | "muted" }
> = {
  divergente: { label: "não bate com o youtube", tone: "bad" },
  fora_do_ar: { label: "vídeo fora do ar", tone: "bad" },
  erro: { label: "não deu pra conferir", tone: "warn" },
  ficha_incompleta: { label: "falta título ou canal", tone: "warn" },
  sem_video: { label: "falta vídeo", tone: "warn" },
  ok: { label: "confere", tone: "good" },
  arquivo_proprio: { label: "vídeo próprio", tone: "muted" },
};

const TONE_CLASS: Record<string, string> = {
  bad: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/40",
  warn: "bg-perestroika-laranja/15 text-perestroika-laranja border-perestroika-laranja/40",
  good: "bg-perestroika-preto/5 text-perestroika-preto/60 border-perestroika-preto/15",
  muted: "bg-perestroika-preto/5 text-perestroika-preto/60 border-perestroika-preto/15",
};

const PROBLEM_STATUSES: CheckStatus[] = [
  "divergente",
  "fora_do_ar",
  "sem_video",
  "ficha_incompleta",
  "erro",
];

/**
 * /admin/videos
 * confere vídeo por vídeo: o que está cadastrado na pílula contra o título e o
 * canal reais do youtube. marca divergência, vídeo fora do ar e slot vazio.
 */
const AdminVideos = () => {
  const [courseFilter, setCourseFilter] = useState<string>("todas");
  const [onlyProblems, setOnlyProblems] = useState(true);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-video-check"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CheckItem[]> => {
      const { data, error } = await supabase.functions.invoke("check-video-links", {
        body: {},
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return ((data as { items?: CheckItem[] })?.items ?? []).sort(
        (a, b) =>
          a.course_slug.localeCompare(b.course_slug) ||
          a.module_number - b.module_number ||
          a.order_index - b.order_index,
      );
    },
  });

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((i) => map.set(i.course_slug, i.course_title));
    return [...map.entries()];
  }, [data]);

  const items = useMemo(() => {
    let list = data ?? [];
    if (courseFilter !== "todas") list = list.filter((i) => i.course_slug === courseFilter);
    if (onlyProblems) list = list.filter((i) => PROBLEM_STATUSES.includes(i.status));
    return list;
  }, [data, courseFilter, onlyProblems]);

  const counts = useMemo(() => {
    const base = data ?? [];
    return {
      total: base.length,
      problemas: base.filter((i) => PROBLEM_STATUSES.includes(i.status)).length,
      graves: base.filter((i) => i.status === "divergente" || i.status === "fora_do_ar").length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display uppercase text-3xl sm:text-4xl leading-none">
          conferência de vídeos
        </h1>
        <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
          cada vídeo cadastrado é conferido no próprio youtube. se o título ou o canal não bate com
          o que está na aula, ou se o vídeo saiu do ar, aparece marcado aqui.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[240px] rounded-xl">
            <SelectValue placeholder="todas as eletivas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">todas as eletivas</SelectItem>
            {courses.map(([slug, title]) => (
              <SelectItem key={slug} value={slug}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={onlyProblems ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setOnlyProblems((v) => !v)}
        >
          {onlyProblems ? "só o que precisa de atenção" : "mostrando tudo"}
        </Button>

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "conferir de novo"}
        </Button>

        {data && (
          <p className="font-body text-xs text-perestroika-preto/60">
            {counts.total} vídeos conferidos · {counts.problemas} pedem atenção · {counts.graves}{" "}
            graves
          </p>
        )}
      </div>

      {error && (
        <p className="font-body text-sm text-perestroika-vermelho">
          não deu pra conferir agora: {(error as Error).message}
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 font-body text-sm text-perestroika-preto/60">
          <Loader2 className="h-4 w-4 animate-spin" /> conferindo cada link no youtube...
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border-2 border-perestroika-preto/15 p-8 text-center space-y-3">
          <CheckCircle2 className="h-6 w-6 mx-auto text-perestroika-preto/60" />
          <p className="font-display uppercase text-xl">tudo batendo</p>
          <p className="font-body text-sm text-perestroika-preto/60 mt-1">
            nenhum vídeo com título trocado, canal errado ou link fora do ar.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {items.map((item) => {
          const meta = STATUS_META[item.status];
          return (
            <article
              key={item.pill_id}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 p-4 sm:p-5 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "font-body text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border",
                    TONE_CLASS[meta.tone],
                  )}
                >
                  {meta.label}
                </span>
                <span className="font-body text-xs text-perestroika-preto/55">
                  {item.course_title} · módulo {String(item.module_number).padStart(2, "0")} · bloco{" "}
                  {item.order_index}
                  {item.is_bonus ? " · bônus" : ""}
                  {item.published ? "" : " · não publicado"}
                </span>
              </div>

              <p className="font-display uppercase text-lg leading-tight">{item.pill_title}</p>

              <div className="grid sm:grid-cols-2 gap-3 mt-3 font-body text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/45">
                    cadastrado na aula
                  </p>
                  <p className={cn(item.title_mismatch && "text-perestroika-vermelho")}>
                    {item.db_title ?? "sem título"}
                  </p>
                  <p
                    className={cn(
                      "text-perestroika-preto/60",
                      item.channel_mismatch && "text-perestroika-vermelho",
                    )}
                  >
                    canal: {item.db_channel ?? "sem canal"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/45 mb-1">
                    no youtube
                  </p>
                  {item.status === "sem_video" ? (
                    <p className="text-perestroika-preto/60 flex items-center gap-2">
                      <VideoOff className="h-4 w-4" /> nenhum vídeo nessa aula ainda
                    </p>
                  ) : item.real_title ? (
                    <>
                      <p>{item.real_title}</p>
                      <p className="text-perestroika-preto/60">canal: {item.real_channel}</p>
                    </>
                  ) : (
                    <p className="text-perestroika-vermelho flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> vídeo indisponível ou removido
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <Link
                  to={`/admin/eletiva/${item.course_slug}/modulo/${item.module_number}`}
                  className="font-body text-xs uppercase tracking-wide underline underline-offset-4"
                >
                  abrir o módulo no admin
                </Link>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-body text-xs uppercase tracking-wide underline underline-offset-4 inline-flex items-center gap-1"
                  >
                    ver o vídeo <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AdminVideos;
