import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, UserPlus, Cpu, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const NIVEL_LABEL: Record<string, string> = {
  "nunca-usei": "nunca usei",
  "ja-mexi": "já mexi",
  "ja-publiquei": "já publiquei",
  "uso-diario": "uso diário",
};

interface Stats {
  totalConvidados: number;
  totalSubmitted: number;
  totalContas: number;
  pctSubmitted: number;
  pctContas: number;
  porNivel: { nivel: string; count: number; pct: number }[];
  topCidades: { cidade: string; count: number }[];
}

const Card = ({
  icon: Icon,
  label,
  value,
  hint,
  delay = 0,
  className = "",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number;
  hint?: string;
  delay?: number;
  className?: string;
  children?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/80 backdrop-blur p-5 sm:p-6 flex flex-col gap-3 ${className}`}
  >
    <div className="flex items-center gap-2 text-perestroika-preto/60">
      <Icon className="h-4 w-4" />
      <span className="font-body text-xs uppercase tracking-wide">{label}</span>
    </div>
    {value !== undefined && (
      <div className="font-display text-5xl sm:text-6xl leading-none text-perestroika-preto">{value}</div>
    )}
    {hint && <p className="font-body text-xs text-perestroika-preto/60">{hint}</p>}
    {children}
  </motion.div>
);

export const AdminStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [
        { count: totalConvidados },
        { count: totalContas },
        { data: fbi, error },
      ] = await Promise.all([
        supabase.from("invited_participants").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("fbi_responses").select("submitted, experiencia_lovable, cidade"),
      ]);
      if (cancelled) return;
      if (error) {
        logger.error("[admin/stats] erro:", error);
        setLoading(false);
        return;
      }

      const all = fbi ?? [];
      const submitted = all.filter((r) => r.submitted);
      const totalSubmitted = submitted.length;
      const convidados = totalConvidados ?? 0;
      const contas = totalContas ?? 0;
      const pctSubmitted = convidados === 0 ? 0 : Math.round((totalSubmitted / convidados) * 100);
      const pctContas = convidados === 0 ? 0 : Math.round((contas / convidados) * 100);

      const nivelCounts = new Map<string, number>();
      submitted.forEach((r) => {
        const k = r.experiencia_lovable ?? "sem info";
        nivelCounts.set(k, (nivelCounts.get(k) ?? 0) + 1);
      });
      const porNivel = Array.from(nivelCounts.entries())
        .map(([nivel, count]) => ({
          nivel,
          count,
          pct: totalSubmitted === 0 ? 0 : Math.round((count / totalSubmitted) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      const cidadeCounts = new Map<string, number>();
      submitted.forEach((r) => {
        const c = r.cidade?.trim().toLowerCase();
        if (!c) return;
        cidadeCounts.set(c, (cidadeCounts.get(c) ?? 0) + 1);
      });
      const topCidades = Array.from(cidadeCounts.entries())
        .map(([cidade, count]) => ({ cidade, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalConvidados: convidados,
        totalSubmitted,
        totalContas: contas,
        pctSubmitted,
        pctContas,
        porNivel,
        topCidades,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/40 h-44 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card
        icon={Users}
        label="convidados"
        value={stats.totalConvidados}
        hint="da planilha perestroika"
        delay={0}
      />
      <Card
        icon={CheckCircle2}
        label="fbi enviado"
        value={`${stats.pctSubmitted}%`}
        hint={`${stats.totalSubmitted} de ${stats.totalConvidados} responderam`}
        delay={0.05}
      />
      <Card
        icon={UserPlus}
        label="contas criadas"
        value={`${stats.pctContas}%`}
        hint={`${stats.totalContas} de ${stats.totalConvidados} entraram no hub`}
        delay={0.1}
      />

      <Card icon={Cpu} label="experiência lovable" delay={0.15} className="lg:col-span-2">
        {stats.porNivel.length === 0 ? (
          <p className="font-body text-xs text-perestroika-preto/50">sem dados por enquanto</p>
        ) : (
          <ul className="flex flex-col gap-2 mt-1">
            {stats.porNivel.slice(0, 5).map((n) => (
              <li key={n.nivel}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-body text-xs text-perestroika-preto truncate">
                    {NIVEL_LABEL[n.nivel] ?? n.nivel}
                  </span>
                  <span className="font-body text-xs tabular-nums text-perestroika-preto/60">
                    {n.count} · {n.pct}%
                  </span>
                </div>
                <div className="h-1 w-full bg-perestroika-preto/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-perestroika-preto transition-all"
                    style={{ width: `${n.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={MapPin} label="top 5 cidades" delay={0.2} className="lg:col-span-2">
        {stats.topCidades.length === 0 ? (
          <p className="font-body text-xs text-perestroika-preto/50">sem dados por enquanto</p>
        ) : (
          <ol className="flex flex-col gap-1.5 mt-1">
            {stats.topCidades.map((c, i) => (
              <li key={c.cidade} className="flex items-baseline justify-between gap-2">
                <span className="font-body text-sm text-perestroika-preto truncate">
                  <span className="text-perestroika-preto/40 mr-2 tabular-nums">{i + 1}</span>
                  {c.cidade}
                </span>
                <span className="font-body text-xs tabular-nums text-perestroika-preto/60">{c.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
};
