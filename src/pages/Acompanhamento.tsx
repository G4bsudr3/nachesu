import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, RefreshCw, Search } from "lucide-react";
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
  ultimo_modulo: number | null;
  pilulas_concluidas: number;
  entregas_enviadas: number;
  ultimo_acesso: string | null;
  status: Status;
};

type TurmaResumo = {
  turma: string;
  total: number;
  entraram: number;
  nao_entraram: number;
  em_andamento: number;
  parados: number;
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
    media_modulos: number;
    modulos_publicados: number;
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
          className="mt-6 w-full rounded-xl border-2 border-perestroika-preto bg-transparent px-4 py-3 font-body text-base text-perestroika-preto placeholder:text-perestroika-preto/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa"
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

function BigNumber({
  valor,
  rotulo,
  heroi,
}: {
  valor: number | string;
  rotulo: string;
  heroi?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "font-display leading-[0.85] tabular-nums",
          heroi
            ? "text-[3.5rem] sm:text-[4.5rem] text-perestroika-vermelho"
            : "text-[2.5rem] sm:text-[3.25rem] text-perestroika-preto",
        )}
      >
        {valor}
      </div>
      <div className="font-body text-[11px] sm:text-xs lowercase tracking-wide text-perestroika-preto/60 mt-1">
        {rotulo}
      </div>
    </div>
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

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 font-body text-[10px] uppercase tracking-wider whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Progresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (feitos / total) * 100) : 0;
  return (
    <div className="min-w-[92px]">
      <div className="font-body text-xs text-perestroika-preto tabular-nums">
        {feitos} de {total}
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-perestroika-preto/12">
        <div className="h-full rounded-full bg-perestroika-preto" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* bloco por eletiva                                                   */
/* ------------------------------------------------------------------ */

type Ordem = "nome" | "progresso" | "acesso";

function EletivaBloco({ eletiva }: { eletiva: Eletiva }) {
  const [busca, setBusca] = useState("");
  const [turma, setTurma] = useState("todas");
  const [status, setStatus] = useState<"todos" | Status>("todos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [asc, setAsc] = useState(true);

  const turmas = useMemo(
    () =>
      [...new Set(eletiva.alunos.map((a) => a.turma || "sem turma"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [eletiva.alunos],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = eletiva.alunos.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q)) return false;
      if (turma !== "todas" && (a.turma || "sem turma") !== turma) return false;
      if (status !== "todos" && a.status !== status) return false;
      return true;
    });

    const dir = asc ? 1 : -1;
    return [...base].sort((a, b) => {
      if (ordem === "nome") {
        // padrão: status mais crítico primeiro, depois nome
        const sa = STATUS_ORDER.indexOf(a.status);
        const sb = STATUS_ORDER.indexOf(b.status);
        if (sa !== sb) return (sa - sb) * dir;
        return a.nome.localeCompare(b.nome) * dir;
      }
      if (ordem === "progresso") return (a.modulos_concluidos - b.modulos_concluidos) * dir;
      const ta = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0;
      const tb = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0;
      return (ta - tb) * dir;
    });
  }, [eletiva.alunos, busca, turma, status, ordem, asc]);

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

  const selectCls =
    "rounded-lg border border-perestroika-preto/25 bg-transparent px-3 py-2 font-body text-sm lowercase text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa";

  const OrdemBtn = ({ o, children }: { o: Ordem; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleOrdem(o)}
      className="inline-flex items-center gap-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 hover:text-perestroika-preto"
    >
      {children}
      {ordem === o &&
        (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <section className="border-t-2 border-perestroika-preto pt-8 mt-12 first:mt-0">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
        eletiva · com {eletiva.professor}
      </p>
      <h2 className="font-display uppercase text-3xl sm:text-5xl leading-[0.9] mt-1 text-perestroika-preto">
        {eletiva.titulo}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
        <BigNumber valor={eletiva.resumo.convidados} rotulo="convidados" />
        <BigNumber valor={eletiva.resumo.entraram} rotulo="entraram" />
        <BigNumber valor={eletiva.resumo.nunca_entraram} rotulo="nunca entraram" heroi />
        <BigNumber valor={eletiva.resumo.em_andamento} rotulo="em andamento" />
      </div>

      <p className="font-body text-xs lowercase text-perestroika-preto/60 mt-4">
        média de {eletiva.resumo.media_modulos} módulos concluídos ·{" "}
        {eletiva.resumo.modulos_publicados} módulos publicados · {eletiva.resumo.parados} parados há
        mais de 14 dias
      </p>

      <DistribBar alunos={eletiva.alunos} />

      {/* por turma */}
      {eletiva.resumo.por_turma.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-3">
          {eletiva.resumo.por_turma.map((t) => (
            <div
              key={t.turma}
              className="border border-perestroika-preto/20 rounded-xl px-4 py-3 min-w-[150px]"
            >
              <div className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                {t.turma}
              </div>
              <div className="font-display text-3xl leading-none text-perestroika-preto mt-1 tabular-nums">
                {t.entraram}
                <span className="text-perestroika-preto/35 text-xl">/{t.total}</span>
              </div>
              <div className="font-body text-[11px] lowercase text-perestroika-preto/60 mt-1">
                entraram · {t.nao_entraram} não
              </div>
            </div>
          ))}
        </div>
      )}

      {/* filtros */}
      <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar por nome"
            className={cn(selectCls, "w-full pl-9")}
          />
        </div>
        <select value={turma} onChange={(e) => setTurma(e.target.value)} className={selectCls}>
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
          className={selectCls}
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

      <div className="flex flex-wrap gap-4 mt-4">
        <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/40">
          ordenar por
        </span>
        <OrdemBtn o="nome">nome</OrdemBtn>
        <OrdemBtn o="progresso">progresso</OrdemBtn>
        <OrdemBtn o="acesso">último acesso</OrdemBtn>
        <span className="font-body text-[11px] lowercase text-perestroika-preto/45 ml-auto tabular-nums">
          {filtrados.length} de {eletiva.alunos.length}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center py-10">
          <EletivaSymbol size={64} pose="resting" />
          <p className="font-body text-sm lowercase text-perestroika-preto/60 mt-4">
            nenhum estudante com esses filtros. tenta limpar a busca ou trocar a turma.
          </p>
        </div>
      ) : (
        <>
          {/* mobile: cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {filtrados.map((a, i) => (
              <li
                key={`${a.nome}-${i}`}
                className="border border-perestroika-preto/20 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-perestroika-preto break-words">
                      {a.nome}
                    </p>
                    <p className="font-body text-[11px] lowercase text-perestroika-preto/55">
                      {a.turma || "sem turma"}
                    </p>
                  </div>
                  <StatusPill status={a.status} />
                </div>
                <div className="mt-3">
                  <Progresso
                    feitos={a.modulos_concluidos}
                    total={eletiva.resumo.modulos_publicados}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-[11px] lowercase text-perestroika-preto/60">
                  <span>último módulo: {a.ultimo_modulo ?? "—"}</span>
                  <span>entregas: {a.entregas_enviadas}</span>
                  <span title={absoluto(a.ultimo_acesso)}>
                    acesso {relativo(a.ultimo_acesso)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* desktop: tabela */}
          <div className="hidden md:block mt-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-perestroika-preto">
                  {["nome", "turma", "status", "módulos", "último módulo", "entregas", "último acesso"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 pb-2"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr
                    key={`${a.nome}-${i}`}
                    className="border-b border-perestroika-preto/12 align-middle"
                  >
                    <td className="py-3 pr-3 font-body text-sm text-perestroika-preto">{a.nome}</td>
                    <td className="py-3 pr-3 font-body text-xs lowercase text-perestroika-preto/65">
                      {a.turma || "sem turma"}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="py-3 pr-3">
                      <Progresso
                        feitos={a.modulos_concluidos}
                        total={eletiva.resumo.modulos_publicados}
                      />
                    </td>
                    <td className="py-3 pr-3 font-body text-sm tabular-nums text-perestroika-preto/80">
                      {a.ultimo_modulo ?? "—"}
                    </td>
                    <td className="py-3 pr-3 font-body text-sm tabular-nums text-perestroika-preto/80">
                      {a.entregas_enviadas}
                    </td>
                    <td
                      className="py-3 font-body text-xs lowercase text-perestroika-preto/70"
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

        {query.data && (
          <div className="mt-14">
            {query.data.eletivas.map((el) => (
              <EletivaBloco key={el.slug} eletiva={el} />
            ))}
            <p className="font-body text-[11px] lowercase text-perestroika-preto/45 mt-16 border-t border-perestroika-preto/15 pt-4">
              dados gerados em {new Date(query.data.gerado_em).toLocaleString("pt-BR")} · página
              interna, não indexada
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
