import { useMemo, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Calendar, Download, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NachesULogo } from "@/components/brand/NachesULogo";

/**
 * página pública do mini-dossiê. link permanente: /dossie/:userId
 * usa RPC public_dossier (SECURITY DEFINER) que retorna dados agregados.
 * ?print=1 abre o diálogo de impressão (browser gera pdf).
 * ?certificado=1 mostra o certificado em vez do dossiê.
 */

type Dossie = {
  aluno: { nome: string | null; email: string | null; avatar_url: string | null } | null;
  gerado_em: string | null;
  evidencias: Array<{ descricao?: string; prova?: string; frase1?: string; entrevistado?: string }> | null;
  stakeholders: unknown | null;
  fluxo_circular: unknown | null;
  proposta_v2: { publico?: string; solucao?: string; frase_ancora?: string; problema?: string } | null;
  bmc_v2: { segmento?: string; canais?: string; receitas?: string[]; custos?: string[] } | null;
  impactos: { pessoas?: { estado_desejado?: string }; planeta?: { estado_desejado?: string }; prosperidade?: { estado_desejado?: string } } | null;
  suposicoes: unknown | null;
  riscos: unknown | null;
  experimento: { o_que_fez?: string; dados_quant?: string; observacoes?: string; criterio_atingido?: string; honestidade?: string } | null;
  pitch: { video_url?: string; hook?: string; problema?: string; solucao?: string; regenera?: string; modelo?: string; chamada?: string } | null;
  carta: { hoje_expectativa?: string; hoje_manchete?: string; reflexao_comparativa?: string } | null;
};

export default function DossieAluno() {
  const { userId } = useParams<{ userId: string }>();
  const [params] = useSearchParams();
  const showCertificado = params.get("certificado") === "1";
  const autoPrint = params.get("print") === "1";

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-dossie", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Dossie> => {
      const { data, error } = await supabase.rpc("get_public_dossier", { p_user_id: userId! });
      if (error) throw error;
      return data as Dossie;
    },
  });

  useEffect(() => {
    if (autoPrint && data) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [autoPrint, data]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-perestroika-bege">
        <Loader2 className="h-8 w-8 animate-spin text-perestroika-preto/50" aria-hidden />
      </div>
    );
  }

  if (error || !data || !data.aluno) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-perestroika-bege p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-display uppercase text-3xl text-perestroika-preto">dossiê não encontrado</h1>
          <p className="font-body text-sm text-perestroika-preto/70">
            esse aluno ainda não completou a eletiva ou o link tá errado.
          </p>
          <Link to="/" className="inline-block font-body text-sm underline text-perestroika-preto">← voltar pra home</Link>
        </div>
      </div>
    );
  }

  if (showCertificado) {
    return <Certificado nome={data.aluno.nome ?? data.aluno.email ?? "estudante"} geradoEm={data.gerado_em} />;
  }

  return (
    <div className="min-h-dvh bg-perestroika-bege">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          body { background: white; }
        }
      `}</style>

      {/* header */}
      <header className="no-print border-b border-perestroika-preto/10 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between gap-4">
          <NachesULogo variant="ink" className="h-6" />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 font-display uppercase text-xs tracking-wide"
          >
            <Download className="h-4 w-4" aria-hidden /> baixar pdf
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-12">
        {/* CAPA */}
        <section className="text-center space-y-4 py-8">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-perestroika-preto/60">
            mini-dossiê · economia circular e negócios regenerativos
          </p>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none tracking-wide text-perestroika-preto">
            {data.aluno.nome ?? data.aluno.email}
          </h1>
          {data.pitch?.hook && (
            <p className="font-body text-base text-perestroika-preto/75 max-w-xl mx-auto italic">
              "{data.pitch.hook}"
            </p>
          )}
          {data.gerado_em && (
            <p className="font-body text-xs text-perestroika-preto/50 flex items-center justify-center gap-1.5">
              <Calendar className="h-3 w-3" aria-hidden />
              gerado em {new Date(data.gerado_em).toLocaleDateString("pt-BR")}
            </p>
          )}
        </section>

        <Divisor />

        {/* PITCH */}
        {data.pitch?.video_url && (
          <Bloco n={9} titulo="pitch em vídeo" origem="aula 20">
            <div className="rounded-2xl overflow-hidden border-2 border-perestroika-preto/15 bg-black">
              <video src={data.pitch.video_url} controls className="w-full aspect-video bg-black" />
            </div>
          </Bloco>
        )}

        {/* PROBLEMA + EVIDÊNCIAS */}
        <Bloco n={1} titulo="problema local + 3 evidências" origem="aula 4">
          {data.evidencias && data.evidencias.length > 0 ? (
            <div className="space-y-3">
              {data.evidencias.slice(0, 3).map((ev, i) => (
                <div key={i} className="rounded-xl border border-perestroika-preto/15 bg-white p-3">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">evidência {i + 1}</p>
                  <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{ev.descricao || ev.prova || ev.frase1 || ev.entrevistado}</p>
                </div>
              ))}
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* PROPOSTA */}
        <Bloco n={4} titulo="proposta de valor v2" origem="aula 18">
          {data.proposta_v2 ? (
            <div className="space-y-2">
              {data.proposta_v2.frase_ancora && (
                <p className="font-display uppercase text-xl leading-tight text-perestroika-preto">"{data.proposta_v2.frase_ancora}"</p>
              )}
              <CampoRow rotulo="público" valor={data.proposta_v2.publico} />
              <CampoRow rotulo="problema" valor={data.proposta_v2.problema} />
              <CampoRow rotulo="solução" valor={data.proposta_v2.solucao} />
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* BMC */}
        <Bloco n={5} titulo="modelo de negócio v2" origem="aula 18">
          {data.bmc_v2 ? (
            <div className="space-y-2">
              <CampoRow rotulo="segmento" valor={data.bmc_v2.segmento} />
              <CampoRow rotulo="canais" valor={data.bmc_v2.canais} />
              {data.bmc_v2.receitas?.length ? <CampoRow rotulo="receitas" valor={data.bmc_v2.receitas.join(" · ")} /> : null}
              {data.bmc_v2.custos?.length ? <CampoRow rotulo="custos" valor={data.bmc_v2.custos.join(" · ")} /> : null}
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* IMPACTOS */}
        <Bloco n={6} titulo="impactos regenerativos" origem="aula 9">
          {data.impactos ? (
            <div className="space-y-2">
              <CampoRow rotulo="pessoas" valor={data.impactos.pessoas?.estado_desejado} />
              <CampoRow rotulo="planeta" valor={data.impactos.planeta?.estado_desejado} />
              <CampoRow rotulo="prosperidade" valor={data.impactos.prosperidade?.estado_desejado} />
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* EXPERIMENTO */}
        <Bloco n={8} titulo="experimento executado + aprendizados" origem="aula 17">
          {data.experimento ? (
            <div className="space-y-2">
              <CampoRow rotulo="o que fez" valor={data.experimento.o_que_fez} />
              <CampoRow rotulo="dados" valor={data.experimento.dados_quant} />
              <CampoRow rotulo="critério atingido" valor={data.experimento.criterio_atingido} />
              <CampoRow rotulo="observações" valor={data.experimento.observacoes} />
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* CARTA DE ENCERRAMENTO */}
        <Bloco n={10} titulo="carta de encerramento · então × agora" origem="aula 20">
          {data.carta ? (
            <div className="space-y-3">
              {data.carta.hoje_expectativa && (
                <div className="rounded-xl bg-white border border-perestroika-preto/15 p-3">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">o que aprendeu sobre si</p>
                  <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{data.carta.hoje_expectativa}</p>
                </div>
              )}
              {data.carta.hoje_manchete && (
                <div className="rounded-xl bg-white border border-perestroika-preto/15 p-3">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">manchete daqui a 5 anos</p>
                  <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{data.carta.hoje_manchete}</p>
                </div>
              )}
              {data.carta.reflexao_comparativa && (
                <div className="rounded-xl bg-perestroika-preto/5 border border-perestroika-preto/15 p-3">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">o que mais mudou em 20 semanas</p>
                  <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap italic">{data.carta.reflexao_comparativa}</p>
                </div>
              )}
            </div>
          ) : <NaoPreenchido />}
        </Bloco>

        {/* footer */}
        <footer className="pt-8 border-t border-perestroika-preto/15 text-center">
          <p className="font-body text-xs text-perestroika-preto/60">
            construído na plataforma NachesU · eletiva Sebrae BH
          </p>
        </footer>
      </main>
    </div>
  );
}

function Bloco({ n, titulo, origem, children }: { n: number; titulo: string; origem: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-4xl text-perestroika-preto/25 leading-none">{String(n).padStart(2, "0")}</span>
        <h2 className="font-display uppercase text-2xl leading-none tracking-wide text-perestroika-preto">{titulo}</h2>
        <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/45">{origem}</span>
      </div>
      {children}
    </section>
  );
}

function CampoRow({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div className="rounded-lg bg-white/60 border border-perestroika-preto/10 p-2.5">
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50">{rotulo}</p>
      <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{valor}</p>
    </div>
  );
}

function NaoPreenchido() {
  return (
    <p className="font-body text-sm text-perestroika-preto/45 italic flex items-center gap-1.5">
      <Sparkles className="h-3.5 w-3.5" aria-hidden /> não preenchido nesse encontro.
    </p>
  );
}

function Divisor() {
  return <hr className="border-perestroika-preto/15" />;
}

function Certificado({ nome, geradoEm }: { nome: string; geradoEm: string | null }) {
  const data = geradoEm ? new Date(geradoEm) : new Date();
  return (
    <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center p-6">
      <style>{`@media print { .no-print { display:none !important } body{background:white} }`}</style>
      <div className="no-print fixed top-4 right-4 z-10">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 font-display uppercase text-xs">
          <Download className="h-4 w-4" aria-hidden /> baixar
        </button>
      </div>
      <div className="w-full max-w-3xl aspect-[1.4/1] bg-white border-8 border-perestroika-preto p-10 sm:p-16 flex flex-col items-center justify-center text-center gap-6">
        <Award className="h-12 w-12 text-perestroika-preto/60" aria-hidden />
        <p className="font-body text-xs uppercase tracking-[0.3em] text-perestroika-preto/60">certificado de conclusão</p>
        <h1 className="font-display uppercase text-4xl sm:text-5xl leading-none tracking-wide text-perestroika-preto">
          {nome}
        </h1>
        <p className="font-body text-sm sm:text-base text-perestroika-preto/75 max-w-lg leading-relaxed">
          concluiu a eletiva <strong>economia circular e negócios regenerativos</strong> na plataforma nachesu, em parceria com a escola sebrae bh, com carga horária de <strong>16h40min</strong>.
        </p>
        <div className="pt-4 space-y-1">
          <p className="font-display uppercase text-lg tracking-wide text-perestroika-preto">
            {data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <p className="font-body text-xs text-perestroika-preto/60">dudu · educador da eletiva</p>
        </div>
      </div>
    </div>
  );
}
