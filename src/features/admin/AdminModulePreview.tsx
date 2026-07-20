import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Monitor,
  Play,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { EletivaStar } from "@/components/brand/EletivaStar";

type Pill = {
  id: string;
  module_id: string;
  order_index: number;
  kind: "pilula_a" | "pilula_b" | "pilula_c" | "exercicio_pbl" | "registro";
  title: string;
  body_md: string;
  duration_min_low: number | null;
  duration_min_high: number | null;
  video_url: string | null;
  attachment_url: string | null;
  required: boolean;
};

type Trail = {
  id: string;
  order_index: number;
  title: string;
  color: string | null;
};

type ModuleRow = {
  id: string;
  number: number;
  title: string;
  objective: string | null;
  trail_id: string;
  total_minutes: number;
  available_from: string | null;
  published: boolean;
};

interface Props {
  module: ModuleRow | null;
  trail: Trail | null | undefined;
  onClose: () => void;
}

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

const pillKindLabel: Record<Pill["kind"], string> = {
  pilula_a: "pílula a",
  pilula_b: "pílula b",
  pilula_c: "pílula c",
  exercicio_pbl: "exercício pbl",
  registro: "registro",
};

type Device = "desktop" | "mobile";

export const AdminModulePreview = ({ module, trail, onClose }: Props) => {
  const [device, setDevice] = useState<Device>("desktop");
  const open = !!module;

  const { data: pills, isLoading } = useQuery({
    queryKey: ["admin-pills-preview", module?.id],
    enabled: !!module?.id,
    queryFn: async () => {
      // o preview simula o que o estudante vê: filtra rascunhos.
      const { data, error } = await supabase
        .from("module_pills")
        .select(
          "id, module_id, order_index, kind, title, body_md, duration_min_low, duration_min_high, video_url, attachment_url, required",
        )
        .eq("module_id", module!.id)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Pill[];
    },
  });

  const trailColor =
    trailColorByOrder[trail?.order_index ?? 1] ?? trail?.color ?? "#fe7b02";

  const isAvailable =
    !!module?.published &&
    (!module?.available_from ||
      new Date(module.available_from).getTime() <= Date.now());

  // largura do "celular" simulado dentro do dialog
  const frameMaxWidth = device === "mobile" ? "max-w-[400px]" : "max-w-3xl";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-perestroika-preto/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <DialogTitle className="font-display uppercase text-xl">
                preview · módulo{" "}
                {module ? String(module.number).padStart(2, "0") : ""}
              </DialogTitle>
              <DialogDescription className="text-xs">
                como o estudante vê em <code>/app/modulo/{module?.number}</code>.{" "}
                {!isAvailable && (
                  <span className="text-perestroika-preto/70">
                    (módulo ainda não está visível pra turma)
                  </span>
                )}
              </DialogDescription>
            </div>

            <div
              role="tablist"
              aria-label="dispositivo"
              className="inline-flex rounded-full border border-perestroika-preto/20 bg-perestroika-bege/70 p-1 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={device === "desktop"}
                onClick={() => setDevice("desktop")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full uppercase tracking-wide transition-colors ${
                  device === "desktop"
                    ? "bg-perestroika-preto text-perestroika-bege"
                    : "text-perestroika-preto/70 hover:text-perestroika-preto"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> desktop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={device === "mobile"}
                onClick={() => setDevice("mobile")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full uppercase tracking-wide transition-colors ${
                  device === "mobile"
                    ? "bg-perestroika-preto text-perestroika-bege"
                    : "text-perestroika-preto/70 hover:text-perestroika-preto"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> mobile
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* área de preview com fundo bege pra simular a página */}
        <div className="flex-1 overflow-y-auto bg-perestroika-bege/40 p-4 sm:p-6">
          {!module ? null : (
            <div
              className={`relative mx-auto bg-perestroika-bege text-perestroika-preto font-body rounded-2xl border border-perestroika-preto/15 overflow-hidden transition-all ${frameMaxWidth}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <EletivaStar
                  size={device === "mobile" ? 180 : 260}
                  color="rosa"
                  className="absolute -right-16 -top-12 opacity-15"
                />
              </div>

              <div className="relative z-10 p-5 sm:p-7">
                {/* breadcrumb fake */}
                <p className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-5">
                  <ArrowLeft className="h-3 w-3" /> meu início
                </p>

                {/* hero */}
                <section
                  aria-label="cabeçalho do módulo"
                  className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto bg-perestroika-bege p-5 sm:p-6 mb-6"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundColor: trailColor }}
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: trailColor }}
                        aria-hidden="true"
                      />
                      {trail?.title?.toLowerCase() ?? "trilha"}
                    </p>
                    <span className="font-body text-[11px] sm:text-xs text-perestroika-preto/60 whitespace-nowrap">
                      módulo {String(module.number).padStart(2, "0")}/20
                    </span>
                  </div>

                  <h1
                    className={`font-display uppercase mb-2 leading-[0.95] ${
                      device === "mobile"
                        ? "text-3xl"
                        : "text-4xl sm:text-5xl"
                    }`}
                  >
                    {module.title}
                  </h1>

                  {module.objective && (
                    <p className="font-body text-sm sm:text-base text-perestroika-preto/75 max-w-2xl mb-4">
                      {module.objective}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-xs sm:text-sm text-perestroika-preto/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {module.total_minutes ?? 50} min
                    </span>
                  </div>
                </section>

                {/* pílulas */}
                <section
                  aria-label="pílulas do módulo"
                  className="space-y-3 mb-6"
                >
                  <h2 className="font-display uppercase text-xl mb-1">
                    pílulas
                  </h2>

                  {isLoading && (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-20 rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] animate-pulse"
                        />
                      ))}
                    </div>
                  )}

                  {!isLoading && (pills?.length ?? 0) === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/20 p-5 text-center">
                      <p className="font-body text-sm text-perestroika-preto/60">
                        nenhuma pílula ainda. adiciona pelo botão "pílulas".
                      </p>
                    </div>
                  )}

                  {pills?.map((pill, idx) => (
                    <article
                      key={pill.id}
                      className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                          {String(idx + 1).padStart(2, "0")} ·{" "}
                          {pillKindLabel[pill.kind]}
                          {!pill.required && " · opcional"}
                        </p>
                        {(pill.duration_min_low || pill.duration_min_high) && (
                          <span className="inline-flex items-center gap-1 font-body text-[11px] text-perestroika-preto/55">
                            <Clock className="h-3 w-3" />
                            {pill.duration_min_low ===
                              pill.duration_min_high ||
                            !pill.duration_min_high
                              ? `${pill.duration_min_low ?? pill.duration_min_high} min`
                              : `${pill.duration_min_low}-${pill.duration_min_high} min`}
                          </span>
                        )}
                      </div>

                      <h3
                        className={`font-display uppercase mb-1.5 leading-tight ${
                          device === "mobile" ? "text-lg" : "text-xl sm:text-2xl"
                        }`}
                      >
                        {pill.title}
                      </h3>

                      {pill.body_md && (
                        <p className="font-body text-sm text-perestroika-preto/75 whitespace-pre-wrap line-clamp-6">
                          {pill.body_md}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {pill.video_url && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/20 px-3 py-1 font-body text-[11px] uppercase tracking-wide">
                            <Play className="h-3 w-3" /> assistir
                          </span>
                        )}
                        {pill.attachment_url && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/20 px-3 py-1 font-body text-[11px] uppercase tracking-wide">
                            <FileText className="h-3 w-3" /> material
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </section>

                {/* cta de conclusão (estática no preview) */}
                <section
                  aria-label="finalizar módulo"
                  className="rounded-2xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-5 sm:p-6 mb-4"
                >
                  <h2
                    className={`font-display uppercase mb-1.5 leading-tight ${
                      device === "mobile" ? "text-xl" : "text-2xl sm:text-3xl"
                    }`}
                  >
                    fechou o módulo?
                  </h2>
                  <p className="font-body text-xs sm:text-sm text-perestroika-bege/75 mb-4 max-w-lg">
                    marca como concluído quando rodar todas as pílulas. sem
                    pressa, sem cobrança.
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-5 py-2.5 font-body font-medium text-xs uppercase tracking-wide">
                    <CheckCircle2 className="h-3.5 w-3.5" /> marcar como
                    concluído
                  </span>
                </section>

                {/* rodapé com badges de estado */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-perestroika-preto/10">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase border-perestroika-preto/25"
                  >
                    {module.published ? "publicado" : "rascunho"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase border-perestroika-preto/25"
                  >
                    {isAvailable ? "visível agora" : "agendado/oculto"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase border-perestroika-preto/25 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3" /> {pills?.length ?? 0}{" "}
                    pílula(s)
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
