import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TutorRow = {
  user_id: string;
  trail_id: string;
  messages: unknown;
  updated_at: string;
};

type TrailRow = { id: string; title: string; order_index: number };

type TrailStats = {
  trail_id: string;
  title: string;
  conversations: number;
  uniqueStudents: number;
  totalMessages: number;
  totalUserMessages: number;
  lastActivity: string | null;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminTutor = () => {
  const { data: trails } = useQuery({
    queryKey: ["admin-tutor-trails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trails")
        .select("id, title, order_index")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrailRow[];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-tutor-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_conversations")
        .select("user_id, trail_id, messages, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TutorRow[];
    },
  });

  const { perTrail, totals } = useMemo(() => {
    const trailMap = new Map<string, TrailRow>();
    (trails ?? []).forEach((t) => trailMap.set(t.id, t));

    const acc = new Map<string, TrailStats>();
    let totalConv = 0;
    let totalMsgs = 0;
    let totalUserMsgs = 0;
    const allStudents = new Set<string>();

    (rows ?? []).forEach((row) => {
      const msgs = Array.isArray(row.messages) ? (row.messages as Array<{ role?: string }>) : [];
      const userMsgs = msgs.filter((m) => m?.role === "user").length;

      // conversa só conta se aluno mandou pelo menos 1 mensagem
      if (userMsgs === 0) return;

      const trail = trailMap.get(row.trail_id);
      const title = trail?.title ?? "trilha removida";
      const cur = acc.get(row.trail_id) ?? {
        trail_id: row.trail_id,
        title,
        conversations: 0,
        uniqueStudents: 0,
        totalMessages: 0,
        totalUserMessages: 0,
        lastActivity: null as string | null,
      };
      cur.conversations += 1;
      cur.totalMessages += msgs.length;
      cur.totalUserMessages += userMsgs;
      if (!cur.lastActivity || row.updated_at > cur.lastActivity) {
        cur.lastActivity = row.updated_at;
      }
      acc.set(row.trail_id, cur);

      allStudents.add(row.user_id);
      totalConv += 1;
      totalMsgs += msgs.length;
      totalUserMsgs += userMsgs;
    });

    // unique students por trilha (segunda passada, agrupando por trail_id)
    const studentsByTrail = new Map<string, Set<string>>();
    (rows ?? []).forEach((row) => {
      const msgs = Array.isArray(row.messages) ? (row.messages as Array<{ role?: string }>) : [];
      if (!msgs.some((m) => m?.role === "user")) return;
      const set = studentsByTrail.get(row.trail_id) ?? new Set<string>();
      set.add(row.user_id);
      studentsByTrail.set(row.trail_id, set);
    });
    acc.forEach((v, k) => {
      v.uniqueStudents = studentsByTrail.get(k)?.size ?? 0;
    });

    // ordena pela order_index da trilha (trilhas sem map vão pro fim)
    const perTrail = Array.from(acc.values()).sort((a, b) => {
      const oa = trailMap.get(a.trail_id)?.order_index ?? 999;
      const ob = trailMap.get(b.trail_id)?.order_index ?? 999;
      return oa - ob;
    });

    return {
      perTrail,
      totals: {
        conversations: totalConv,
        uniqueStudents: allStudents.size,
        totalMessages: totalMsgs,
        totalUserMessages: totalUserMsgs,
      },
    };
  }, [rows, trails]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-perestroika-preto/60 font-body text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando conversas com o tutor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">tutor IA</h1>
        <p className="font-body text-sm text-perestroika-preto/65 mt-2 max-w-xl">
          intera&ccedil;&otilde;es do joão-de-barro com a turma. 1 conversa = 1 dupla aluno + trilha (a infra j&aacute; deduplica). conversas sem nenhuma mensagem do aluno n&atilde;o entram nos n&uacute;meros.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<MessageCircle className="h-4 w-4" />} label="conversas ativas" value={totals.conversations} hint={`${totals.totalUserMessages} perguntas no total`} />
        <StatCard icon={<Users className="h-4 w-4" />} label="alunos engajados" value={totals.uniqueStudents} hint="únicos no histórico" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="mensagens totais" value={totals.totalMessages} hint="aluno + tutor somados" />
      </section>

      <section className="rounded-2xl border border-perestroika-preto/15 overflow-hidden bg-perestroika-bege/30">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-display uppercase text-xs">trilha</TableHead>
              <TableHead className="font-display uppercase text-xs text-right">conversas</TableHead>
              <TableHead className="font-display uppercase text-xs text-right">alunos únicos</TableHead>
              <TableHead className="font-display uppercase text-xs text-right">perguntas</TableHead>
              <TableHead className="font-display uppercase text-xs text-right">média/aluno</TableHead>
              <TableHead className="font-display uppercase text-xs">última atividade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perTrail.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center font-body text-sm text-perestroika-preto/55 py-8">
                  ningu&eacute;m abriu o tutor ainda.
                </TableCell>
              </TableRow>
            )}
            {perTrail.map((t) => {
              const avg = t.uniqueStudents > 0 ? (t.totalUserMessages / t.uniqueStudents).toFixed(1) : "—";
              return (
                <TableRow key={t.trail_id}>
                  <TableCell className="font-body text-sm">{t.title.toLowerCase()}</TableCell>
                  <TableCell className="text-right font-display text-lg">{t.conversations}</TableCell>
                  <TableCell className="text-right font-display text-lg">{t.uniqueStudents}</TableCell>
                  <TableCell className="text-right font-body text-sm tabular-nums">{t.totalUserMessages}</TableCell>
                  <TableCell className="text-right font-body text-sm tabular-nums">{avg}</TableCell>
                  <TableCell className="font-body text-xs text-perestroika-preto/65">{fmtDate(t.lastActivity)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) => (
  <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
    <div className="flex items-center gap-2 text-perestroika-preto/60 mb-2">
      {icon}
      <span className="font-body text-[10px] uppercase tracking-[0.2em]">{label}</span>
    </div>
    <p className="font-display text-5xl leading-none">{value}</p>
    <p className="font-body text-xs text-perestroika-preto/55 mt-2">{hint}</p>
  </div>
);
