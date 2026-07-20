import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Check, Archive, Radio } from "lucide-react";
import { logger } from "@/lib/logger";

type PendingRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  created_at: string;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// rpc tipada manualmente: admin_set_profile_status ainda não tá no types.ts gerado
type AdminSetProfileStatusRpc = {
  rpc: (
    name: "admin_set_profile_status",
    args: { _user_id: string; _status: "active" | "archived" | "pending" },
  ) => Promise<{ data: null; error: Error | null }>;
};
const adminRpc = supabase as unknown as AdminSetProfileStatusRpc;

export const AdminPending = () => {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_pending_profiles");
    if (error) {
      logger.error("[admin/pending] erro:", error);
      toast.error("não foi possível carregar pendentes");
    } else {
      setRows((data as PendingRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // realtime: quando alguém aparece como pending ou muda status, recarrega.
  useEffect(() => {
    const channel = supabase
      .channel("admin-pending-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => load(),
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const setStatus = async (userId: string, status: "active" | "archived") => {
    setActing(userId);
    const { error } = await adminRpc.rpc("admin_set_profile_status", {
      _user_id: userId,
      _status: status,
    });
    setActing(null);
    if (error) {
      const verb = status === "active" ? "aprovar" : "arquivar";
      toast.error(`não foi possível ${verb}`);
      logger.error(error);
    } else {
      toast.success(status === "active" ? "aprovado" : "arquivado");
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
    }
  };

  const handleApprove = (userId: string) => setStatus(userId, "active");
  const handleArchive = (userId: string) => setStatus(userId, "archived");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            pendentes
          </h1>
          <p className="mt-3 text-perestroika-preto/70 inline-flex items-center gap-2 flex-wrap">
            <span>{loading ? "carregando…" : `${rows.length} aguardando aprovação`}</span>
            {live && (
              <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-perestroika-preto/50">
                <Radio className="w-3 h-3 text-green-600" /> ao vivo
              </span>
            )}
          </p>
        </div>
      </div>

      {/* mobile: cards */}
      <div className="sm:hidden space-y-2">
        {loading && (
          <div className="text-center py-12 text-perestroika-preto/50">carregando…</div>
        )}
        {!loading && rows.length === 0 && (
          <div className="text-center py-12 text-perestroika-preto/50">
            nenhum pendente. tudo em dia.
          </div>
        )}
        {!loading &&
          rows.map((r) => (
            <div
              key={r.user_id}
              className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.email}</p>
                  <p className="text-xs text-perestroika-preto/70 truncate">
                    {r.display_name ?? r.nickname ?? "sem nome"}
                  </p>
                  <p className="text-[11px] text-perestroika-preto/50 mt-1">
                    {formatDate(r.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(r.user_id)}
                  disabled={acting === r.user_id}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-2 text-xs uppercase tracking-wide disabled:opacity-40"
                >
                  <Check className="w-3 h-3" /> aprovar
                </button>
                <button
                  onClick={() => handleArchive(r.user_id)}
                  disabled={acting === r.user_id}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-perestroika-preto/20 px-3 py-2 text-xs uppercase tracking-wide disabled:opacity-40"
                >
                  <Archive className="w-3 h-3" /> arquivar
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* desktop: table */}
      <div className="hidden sm:block rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">criado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">email</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">nome</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-perestroika-preto/50">
                  carregando…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-perestroika-preto/50">
                  nenhum pendente. tudo em dia.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => (
                <TableRow key={r.user_id} className="hover:bg-perestroika-preto/5">
                  <TableCell className="text-xs text-perestroika-preto/70">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell className="text-perestroika-preto/80">
                    {r.display_name ?? r.nickname ?? "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleApprove(r.user_id)}
                        disabled={acting === r.user_id}
                        className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-1.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
                      >
                        <Check className="w-3 h-3" />
                        aprovar
                      </button>
                      <button
                        onClick={() => handleArchive(r.user_id)}
                        disabled={acting === r.user_id}
                        className="inline-flex items-center gap-1 rounded-full border border-perestroika-preto/20 px-3 py-1.5 text-xs uppercase tracking-wide hover:border-perestroika-preto/50 transition-colors disabled:opacity-40"
                      >
                        <Archive className="w-3 h-3" />
                        arquivar
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
