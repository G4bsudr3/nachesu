import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, RefreshCw, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/useSeo";
import { cn } from "@/lib/utils";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

/* ------------------------------------------------------------------ */
/* tipos                                                               */
/* ------------------------------------------------------------------ */

type Status = "nao_entrou" | "entrou_sem_comecar" | "em_andamento" | "parado" | "concluiu";

type Aluno = {
  nome: string;
  turma: string | null;
  entrou: boolean;
  modulos_concluidos: number;
  pct: number;
  ultimo_modulo: number | null;
  pilulas_concluidas: number;
  entregas_enviadas: number;
  ultimo_acesso: string | null;
  ativo_7d: boolean;
  app_nao_abriu?: boolean;
  status: Status;
};

type TurmaResumo = {
  turma: string;
  total: number;
  entraram: number;
  nao_entraram: number;
  em_andamento: number;
  parados: number;
  ativos_7d: number;
  media_modulos: number;
};

type Eletiva = {
  slug: string;
  titulo: string;
  professor: string;
  alunos: Aluno[];
  resumo: {
    convidados: number;
    entraram: number;
    nunca_entraram: number;
    entrou_sem_comecar: number;
    em_andamento: number;
    parados: number;
    concluiram: number;
    ativos_7d: number;
    media_modulos: number;
    modulos_publicados: number;
    pilulas_publicadas: number;
    por_turma: TurmaResumo[];
  };
};

type Painel = { gerado_em: string; eletivas: Eletiva[] };

/* ------------------------------------------------------------------ */
/* sessão (12h, por aba)                                               */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "painel-escola-sessao";
const TWELVE_H = 12 * 60 * 60 * 1000;

function loadSession(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: string; exp: number };
    if (!parsed?.t || Date.now() > parsed.exp) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return atob(parsed.t);
  } catch {
    return null;
  }
}

function saveSession(senha: string) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ t: btoa(senha), exp: Date.now() + TWELVE_H }),
    );
  } catch {
    /* sessão indisponível: segue só em memória */
  }
}

/* ------------------------------------------------------------------ */
/* formatação                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<Status, string> = {
  nao_entrou: "nunca entrou",
  entrou_sem_comecar: "entrou, não começou",
  em_andamento: "em andamento",
  parado: "parado",
  concluiu: "concluiu",
};

const STATUS_ORDER: Status[] = [
  "nao_entrou",
  "entrou_sem_comecar",
  "parado",
  "em_andamento",
  "concluiu",
];

const STATUS_STYLE: Record<Status, string> = {
  nao_entrou: "bg-perestroika-vermelho text-perestroika-bege",
  entrou_sem_comecar: "bg-perestroika-laranja text-perestroika-preto",
  em_andamento: "bg-perestroika-rosa text-perestroika-preto",
  parado: "bg-perestroika-preto text-perestroika-bege",
  concluiu: "bg-perestroika-azul text-perestroika-bege",
};

const STATUS_BAR: Record<Status, string> = {
  nao_entrou: "bg-perestroika-vermelho",
  entrou_sem_comecar: "bg-perestroika-laranja",
  em_andamento: "bg-perestroika-rosa",
  parado: "bg-perestroika-preto/60",
  concluiu: "bg-perestroika-azul",
};

function relativo(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "há 1 dia";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return m === 1 ? "há 1 mês" : `há ${m} meses`;
}

const absoluto = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "sem registro de acesso";

/* ------------------------------------------------------------------ */
/* gate de senha                                                       */
/* ------------------------------------------------------------------ */

function Gate({ onOk }: { onOk: (senha: string) => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim() || loading) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("painel-escola", {
      body: { senha: senha.trim() },
    });
    setLoading(false);
    if (error || !data) {
      setErro("senha inválida ou muitas tentativas. tenta de novo em alguns minutos.");
      return;
    }
    saveSession(senha.trim());
    onOk(senha.trim());
  };

  return (
    <main className="min-h-dvh bg-perestroika-bege flex items-center justify-center px-5 py-16">
      <form onSubmit={submit} className="w-full max-w-sm">
        <NachesULogo variant="ink" height={30} showSelo={false} />
        <h1 className="font-display uppercase text-4xl leading-[0.9] mt-8 text-perestroika-preto">
          painel da
          <br />
          coordenação
        </h1>
        <p className="font-body text-sm text-perestroika-preto/65 mt-3 lowercase">
          acompanhamento dos estudantes das duas eletivas. digite a senha que você recebeu.
        </p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="senha"
          autoFocus
          className="mt-6 w-full rounded-xl border-2 border-perestroika-preto bg-transparent px-4 py-3 font-body text-base text-perestroika-preto placeholder:text-perestroika-preto/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa"
        />
        {erro && (
          <p className="font-body text-sm text-perestroika-vermelho mt-3" role="alert">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-perestroika-preto px-4 py-3 font-display uppercase tracking-wide text-lg text-perestroika-bege disabled:opacity-60"
        >
          {loading ? "conferindo..." : "entrar"}
        </button>
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* blocos visuais                                                      */
/* ------------------------------------------------------------------ */

/** cartão de número que também funciona como filtro rápido de status */
function StatCard({
  valor,
  rotulo,
  detalhe,
  ativo,
  onClick,
  destaque,
}: {
  valor: number | string;
  rotulo: string;
  detalhe?: string;
  ativo?: boolean;
  onClick?: () => void;
  destaque?: "alerta" | "ok";
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!ativo : undefined}
      className={cn(
        "text-left rounded-2xl border px-4 py-3 transition-colors min-w-0",
        ativo
          ? "border-perestroika-preto bg-perestroika-preto/[0.06]"
          : "border-perestroika-preto/15",
        onClick && "cursor-pointer hover:border-perestroika-preto/50 hover:bg-perestroika-preto/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa",
      )}
    >
      <div className="font-body text-[11px] lowercase tracking-wide text-perestroika-preto/55">
        {rotulo}
      </div>
      <div
        className={cn(
          "font-display leading-[0.85] tabular-nums text-[2.5rem] sm:text-[3rem] mt-1",
          destaque === "alerta"
            ? "text-perestroika-vermelho"
            : destaque === "ok"
              ? "text-perestroika-azul"
              : "text-perestroika-preto",
        )}
      >
        {valor}
      </div>
      {detalhe && (
        <div className="font-body text-[11px] lowercase text-perestroika-preto/50 mt-1">
          {detalhe}
        </div>
      )}
    </Comp>
  );
}

function DistribBar({ alunos }: { alunos: Aluno[] }) {
  const total = alunos.length || 1;
  const partes = STATUS_ORDER.map((s) => ({
    s,
    n: alunos.filter((a) => a.status === s).length,
  })).filter((p) => p.n > 0);

  return (
    <div className="mt-6">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-perestroika-preto/20">
        {partes.map((p) => (
          <div
            key={p.s}
            className={STATUS_BAR[p.s]}
            style={{ width: `${(p.n / total) * 100}%` }}
            title={`${STATUS_LABEL[p.s]}: ${p.n}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {partes.map((p) => (
          <span
            key={p.s}
            className="font-body text-[11px] lowercase text-perestroika-preto/65 inline-flex items-center gap-1.5"
          >
            <span className={cn("h-2 w-2 rounded-full", STATUS_BAR[p.s])} />
            {STATUS_LABEL[p.s]} · {p.n}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status, appNaoAbriu }: { status: Status; appNaoAbriu?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 justify-end">
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-1 font-body text-[10px] uppercase tracking-wider whitespace-nowrap",
          STATUS_STYLE[status],
        )}
      >
        {STATUS_LABEL[status]}
      </span>
      {appNaoAbriu && (
        <span
          title="entrou pelo link mas o app nunca abriu no aparelho dela"
          className="inline-block rounded-full border border-perestroika-preto/25 px-2 py-1 font-body text-[10px] lowercase tracking-wide text-perestroika-preto/65 whitespace-nowrap"
        >
          app não abriu
        </span>
      )}
    </span>
  );
}


function Progresso({ feitos, total, pct }: { feitos: number; total: number; pct: number }) {
  const w = total > 0 ? Math.min(100, (feitos / total) * 100) : 0;
  return (
    <div className="min-w-[110px]">
      <div className="font-body text-xs text-perestroika-preto tabular-nums">
        {feitos} de {total}
        <span className="text-perestroika-preto/45"> · {pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-perestroika-preto/12">
        <div className="h-full rounded-full bg-perestroika-preto" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* bloco por eletiva                                                   */
/* ------------------------------------------------------------------ */

type Ordem = "atividade" | "nome" | "progresso" | "acesso";

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function EletivaBloco({ eletiva }: { eletiva: Eletiva }) {
  const [busca, setBusca] = useState("");
  const [turma, setTurma] = useState("todas");
  const [status, setStatus] = useState<"todos" | Status>("todos");
  const [ordem, setOrdem] = useState<Ordem>("atividade");
  const [asc, setAsc] = useState(false);


  const turmas = useMemo(
    () =>
      [...new Set(eletiva.alunos.map((a) => a.turma || "sem turma"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [eletiva.alunos],
  );

  // trava anti-filtro-fantasma: turma que sumiu dos dados volta pra "todas"
  useEffect(() => {
    if (turma !== "todas" && !turmas.includes(turma)) setTurma("todas");
  }, [turma, turmas]);

  const turmaAtiva = turma !== "todas" && turmas.includes(turma) ? turma : "todas";
  const temFiltro = !!busca.trim() || turmaAtiva !== "todas" || status !== "todos";

  const limpar = () => {
    setBusca("");
    setTurma("todas");
    setStatus("todos");
  };

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim());
    const base = eletiva.alunos.filter((a) => {
      if (q && !semAcento(`${a.nome} ${a.turma ?? ""}`).includes(q)) return false;
      if (turmaAtiva !== "todas" && (a.turma || "sem turma") !== turmaAtiva) return false;
      if (status !== "todos" && a.status !== status) return false;
      return true;
    });

    const ts = (v: string | null) => (v ? new Date(v).getTime() : 0);
    const dir = asc ? 1 : -1;
    return [...base].sort((a, b) => {
      if (ordem === "atividade") {
        if (a.modulos_concluidos !== b.modulos_concluidos)
          return (a.modulos_concluidos - b.modulos_concluidos) * dir;
        const ta = ts(a.ultimo_acesso);
        const tb = ts(b.ultimo_acesso);
        if (ta !== tb) return (ta - tb) * dir;
        return a.nome.localeCompare(b.nome);
      }
      if (ordem === "nome") {
        // status mais crítico primeiro, depois nome
        const sa = STATUS_ORDER.indexOf(a.status);
        const sb = STATUS_ORDER.indexOf(b.status);
        if (sa !== sb) return (sa - sb) * dir;
        return a.nome.localeCompare(b.nome) * dir;
      }
      if (ordem === "progresso") return (a.modulos_concluidos - b.modulos_concluidos) * dir;
      return (ts(a.ultimo_acesso) - ts(b.ultimo_acesso)) * dir;
    });
  }, [eletiva.alunos, busca, turmaAtiva, status, ordem, asc]);

  const toggleOrdem = (o: Ordem) => {
    if (ordem === o) setAsc((v) => !v);
    else {
      setOrdem(o);
      setAsc(o === "nome");
    }
  };


  const baixarCsv = useCallback(() => {
    const head = [
      "nome",
      "turma",
      "entrou",
      "status",
      "modulos_concluidos",
      "modulos_publicados",
      "percentual",
      "ultimo_modulo",
      "pilulas_concluidas",
      "entregas_enviadas",
      "ultimo_acesso",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtrados.map((a) =>
      [
        a.nome,
        a.turma ?? "",
        a.entrou ? "sim" : "não",
        STATUS_LABEL[a.status],
        a.modulos_concluidos,
        eletiva.resumo.modulos_publicados,
        `${a.pct}%`,
        a.ultimo_modulo ?? "",
        a.pilulas_concluidas,
        a.entregas_enviadas,
        a.ultimo_acesso ? new Date(a.ultimo_acesso).toLocaleString("pt-BR") : "",
      ]
        .map(esc)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [head.join(","), ...linhas].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acompanhamento-${eletiva.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtrados, eletiva]);

  const campoCls =
    "rounded-lg border border-perestroika-preto/25 bg-transparent px-3 py-2 font-body text-sm lowercase text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa";

  const OrdemBtn = ({ o, children }: { o: Ordem; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleOrdem(o)}
      className={cn(
        "inline-flex items-center gap-1 font-body text-[11px] uppercase tracking-wider",
        ordem === o ? "text-perestroika-preto" : "text-perestroika-preto/50 hover:text-perestroika-preto",
      )}
    >
      {children}
      {ordem === o && (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  const filtrarStatus = (s: Status) => setStatus((atual) => (atual === s ? "todos" : s));

  return (
    <section>
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
        eletiva · com {eletiva.professor}
      </p>
      <h2 className="font-display uppercase text-3xl sm:text-5xl leading-[0.9] mt-1 text-perestroika-preto">
        {eletiva.titulo}
      </h2>
      <p className="font-body text-xs lowercase text-perestroika-preto/60 mt-3">
        {eletiva.resumo.modulos_publicados} módulos publicados · média de{" "}
        {eletiva.resumo.media_modulos} concluídos por estudante · {eletiva.resumo.ativos_7d} ativos
        nos últimos 7 dias
      </p>

      {/* números clicáveis: cada um filtra a lista abaixo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <StatCard
          valor={eletiva.resumo.nunca_entraram}
          rotulo="nunca entraram"
          detalhe={`de ${eletiva.resumo.convidados} convidados`}
          destaque="alerta"
          ativo={status === "nao_entrou"}
          onClick={() => filtrarStatus("nao_entrou")}
        />
        <StatCard
          valor={eletiva.resumo.entrou_sem_comecar}
          rotulo="entraram e não começaram"
          detalhe="sem nenhuma aula concluída"
          ativo={status === "entrou_sem_comecar"}
          onClick={() => filtrarStatus("entrou_sem_comecar")}
        />
        <StatCard
          valor={eletiva.resumo.em_andamento}
          rotulo="em andamento"
          detalhe={`${eletiva.resumo.parados} parados há +14 dias`}
          ativo={status === "em_andamento"}
          onClick={() => filtrarStatus("em_andamento")}
        />
        <StatCard
          valor={eletiva.resumo.concluiram}
          rotulo="concluíram tudo"
          detalhe={`${eletiva.resumo.modulos_publicados} de ${eletiva.resumo.modulos_publicados} módulos`}
          destaque="ok"
          ativo={status === "concluiu"}
          onClick={() => filtrarStatus("concluiu")}
        />
      </div>

      <DistribBar alunos={eletiva.alunos} />

      {/* turmas: chips que filtram */}
      {eletiva.resumo.por_turma.length > 1 && (
        <div className="mt-8">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/45">
            por turma · toque pra filtrar
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {eletiva.resumo.por_turma.map((t) => {
              const ativo = turmaAtiva === t.turma;
              const pct = t.total ? (t.entraram / t.total) * 100 : 0;
              return (
                <button
                  key={t.turma}
                  type="button"
                  onClick={() => setTurma(ativo ? "todas" : t.turma)}
                  aria-pressed={ativo}
                  className={cn(
                    "text-left border rounded-xl px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa",
                    ativo
                      ? "border-perestroika-preto bg-perestroika-preto/[0.06]"
                      : "border-perestroika-preto/15 hover:border-perestroika-preto/50",
                  )}
                >
                  <div className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                    {t.turma}
                  </div>
                  <div className="font-display text-3xl leading-none text-perestroika-preto mt-1 tabular-nums">
                    {t.entraram}
                    <span className="text-perestroika-preto/35 text-xl">/{t.total}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-perestroika-preto/12">
                    <div
                      className="h-full rounded-full bg-perestroika-rosa"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="font-body text-[11px] lowercase text-perestroika-preto/60 mt-2">
                    entraram · {t.nao_entraram} não · média {t.media_modulos}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* filtros */}
      <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/60" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar por nome ou turma"
            className={cn(campoCls, "w-full pl-9 pr-9")}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-perestroika-preto/50 hover:text-perestroika-preto"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select value={turmaAtiva} onChange={(e) => setTurma(e.target.value)} className={campoCls}>
          <option value="todas">todas as turmas</option>
          {turmas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | "todos")}
          className={campoCls}
        >
          <option value="todos">todos os status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={baixarCsv}
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-perestroika-preto px-4 py-2 font-body text-sm lowercase text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
        >
          <Download className="h-4 w-4" /> baixar csv
        </button>
      </div>

      {temFiltro && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {turmaAtiva !== "todas" && (
            <span className="rounded-full border border-perestroika-preto/25 px-3 py-1 font-body text-[11px] lowercase text-perestroika-preto/75">
              turma {turmaAtiva}
            </span>
          )}
          {status !== "todos" && (
            <span className="rounded-full border border-perestroika-preto/25 px-3 py-1 font-body text-[11px] lowercase text-perestroika-preto/75">
              {STATUS_LABEL[status]}
            </span>
          )}
          {!!busca.trim() && (
            <span className="rounded-full border border-perestroika-preto/25 px-3 py-1 font-body text-[11px] lowercase text-perestroika-preto/75">
              busca "{busca.trim()}"
            </span>
          )}
          <button
            type="button"
            onClick={limpar}
            className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto px-3 py-1 font-body text-[11px] lowercase text-perestroika-bege"
          >
            <X className="h-3 w-3" /> limpar filtros
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mt-5">
        <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          ordenar por
        </span>
        <OrdemBtn o="atividade">atividade</OrdemBtn>
        <OrdemBtn o="progresso">progresso</OrdemBtn>
        <OrdemBtn o="acesso">último acesso</OrdemBtn>
        <OrdemBtn o="nome">nome</OrdemBtn>

        <span className="font-body text-[11px] lowercase text-perestroika-preto/55 ml-auto tabular-nums">
          mostrando {filtrados.length} de {eletiva.alunos.length} estudantes
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center py-12 border border-dashed border-perestroika-preto/20 rounded-2xl">
          <EletivaSymbol size={64} pose="resting" />
          <p className="font-body text-sm lowercase text-perestroika-preto/65 mt-4 max-w-xs">
            nenhum estudante com esses filtros. limpa os filtros pra ver a turma inteira.
          </p>
          <button
            type="button"
            onClick={limpar}
            className="mt-4 rounded-lg bg-perestroika-preto px-4 py-2 font-body text-sm lowercase text-perestroika-bege"
          >
            limpar filtros
          </button>
        </div>
      ) : (
        <>
          {/* mobile: cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {filtrados.map((a, i) => (
              <li
                key={`${a.nome}-${i}`}
                className="border border-perestroika-preto/15 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-perestroika-preto break-words">
                      {a.nome}
                    </p>
                    <p className="font-body text-[11px] text-perestroika-preto/55">
                      {a.turma || "sem turma"}
                    </p>
                  </div>
                  <StatusPill status={a.status} appNaoAbriu={a.app_nao_abriu} />
                </div>
                <div className="mt-3">
                  <Progresso
                    feitos={a.modulos_concluidos}
                    total={eletiva.resumo.modulos_publicados}
                    pct={a.pct}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-[11px] lowercase text-perestroika-preto/60">
                  <span>onde está: módulo {a.ultimo_modulo ?? "—"}</span>
                  <span>entregas: {a.entregas_enviadas}</span>
                  <span title={absoluto(a.ultimo_acesso)}>acesso {relativo(a.ultimo_acesso)}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* desktop: tabela */}
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-perestroika-bege z-10">
                <tr className="border-b-2 border-perestroika-preto">
                  {[
                    "estudante",
                    "turma",
                    "status",
                    "módulos concluídos",
                    "onde está",
                    "entregas",
                    "último acesso",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 py-2 pr-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr
                    key={`${a.nome}-${i}`}
                    className={cn(
                      "border-b border-perestroika-preto/10 align-middle",
                      i % 2 === 1 && "bg-perestroika-preto/[0.03]",
                    )}
                  >
                    <td className="py-3 pr-3 font-body text-sm text-perestroika-preto">{a.nome}</td>
                    <td className="py-3 pr-3 font-body text-xs text-perestroika-preto/65 whitespace-nowrap">
                      {a.turma || "sem turma"}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill status={a.status} appNaoAbriu={a.app_nao_abriu} />
                    </td>
                    <td className="py-3 pr-3">
                      <Progresso
                        feitos={a.modulos_concluidos}
                        total={eletiva.resumo.modulos_publicados}
                        pct={a.pct}
                      />
                    </td>
                    <td className="py-3 pr-3 font-body text-sm tabular-nums text-perestroika-preto/80 whitespace-nowrap">
                      {a.ultimo_modulo ? `módulo ${a.ultimo_modulo}` : "—"}
                    </td>
                    <td className="py-3 pr-3 font-body text-sm tabular-nums text-perestroika-preto/80">
                      {a.entregas_enviadas}
                    </td>
                    <td
                      className="py-3 font-body text-xs lowercase text-perestroika-preto/70 whitespace-nowrap"
                      title={absoluto(a.ultimo_acesso)}
                    >
                      {relativo(a.ultimo_acesso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* página                                                              */
/* ------------------------------------------------------------------ */

export default function Acompanhamento() {
  useSeo({
    path: "/acompanhamento",
    title: "painel da coordenação · nachesu",
    description: "acompanhamento interno dos estudantes das eletivas.",
    noindex: true,
  });

  const [senha, setSenha] = useState<string | null>(() => loadSession());
  const [agora, setAgora] = useState(Date.now());
  const [aba, setAba] = useState(0);

  const query = useQuery({
    queryKey: ["painel-escola"],
    enabled: !!senha,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async (): Promise<Painel> => {
      const { data, error } = await supabase.functions.invoke("painel-escola", {
        body: { senha },
      });
      if (error) throw error;
      return data as Painel;
    },
  });

  // relógio do selo "atualizado há X"
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!senha) return <Gate onOk={setSenha} />;

  const atualizadoHa = query.dataUpdatedAt
    ? relativo(new Date(query.dataUpdatedAt).toISOString())
    : "carregando";
  void agora;

  const eletivas = query.data?.eletivas ?? [];
  const atual = eletivas[Math.min(aba, Math.max(eletivas.length - 1, 0))];

  return (
    <main className="min-h-dvh bg-perestroika-bege">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <NachesULogo variant="ink" height={26} showSelo={false} />
            <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.85] mt-5 text-perestroika-preto">
              quem está
              <br />
              fazendo
            </h1>
            <p className="font-body text-sm lowercase text-perestroika-preto/65 mt-3 max-w-md">
              acompanhamento dos estudantes nas duas eletivas. atualiza sozinho a cada minuto.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body text-[11px] lowercase text-perestroika-preto/55 tabular-nums">
              atualizado {atualizadoHa}
            </span>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-perestroika-preto px-3 py-2 font-body text-sm lowercase text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
              atualizar
            </button>
          </div>
        </header>

        {query.isLoading && (
          <div className="mt-16 flex flex-col items-center">
            <div className="motion-safe:animate-pulse">
              <EletivaSymbol size={72} pose="building" />
            </div>
            <p className="font-body text-xs lowercase text-perestroika-preto/55 mt-4">
              somando o progresso da turma...
            </p>
            <div className="w-full mt-10 space-y-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-perestroika-preto/8 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {query.isError && !query.isLoading && (
          <div className="mt-16 border-2 border-perestroika-vermelho rounded-2xl p-6">
            <p className="font-display uppercase text-2xl text-perestroika-vermelho">
              não deu pra carregar
            </p>
            <p className="font-body text-sm lowercase text-perestroika-preto/70 mt-2">
              pode ser a sessão que expirou. tenta atualizar, e se continuar, entre de novo com a
              senha.
            </p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(SESSION_KEY);
                setSenha(null);
              }}
              className="mt-4 rounded-lg border-2 border-perestroika-preto px-4 py-2 font-body text-sm lowercase"
            >
              entrar de novo
            </button>
          </div>
        )}

        {atual && (
          <div className="mt-12">
            {/* abas: uma eletiva por vez, sem rolagem infinita */}
            {eletivas.length > 1 && (
              <div
                role="tablist"
                aria-label="eletivas"
                className="flex flex-wrap gap-2 border-b-2 border-perestroika-preto/15 pb-3 mb-8"
              >
                {eletivas.map((el, i) => (
                  <button
                    key={el.slug}
                    role="tab"
                    aria-selected={i === aba}
                    type="button"
                    onClick={() => setAba(i)}
                    className={cn(
                      "rounded-full px-4 py-2 font-body text-sm lowercase transition-colors",
                      i === aba
                        ? "bg-perestroika-preto text-perestroika-bege"
                        : "border border-perestroika-preto/25 text-perestroika-preto/70 hover:border-perestroika-preto",
                    )}
                  >
                    {el.titulo}
                    <span className="tabular-nums opacity-60"> · {el.resumo.convidados}</span>
                  </button>
                ))}
              </div>
            )}

            <EletivaBloco key={atual.slug} eletiva={atual} />

            <p className="font-body text-[11px] lowercase text-perestroika-preto/45 mt-16 border-t border-perestroika-preto/15 pt-4">
              dados gerados em{" "}
              {query.data ? new Date(query.data.gerado_em).toLocaleString("pt-BR") : "—"} · só
              aparecem estudantes da lista da escola · página interna, não indexada
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
