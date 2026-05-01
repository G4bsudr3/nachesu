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
import { Check, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

type PendingRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  created_at: string;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminPending = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

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

  const handleApprove = async (userId: string) => {
    setActing(userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by_admin_id: user?.id ?? null,
      })
      .eq("user_id", userId);
    setActing(null);
    if (error) {
      toast.error("não foi possível aprovar");
      logger.error(error);
    } else {
      toast.success("aprovado");
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
    }
  };

  const handleArchive = async (userId: string) => {
    setActing(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "archived" })
      .eq("user_id", userId);
    setActing(null);
    if (error) {
      toast.error("não foi possível arquivar");
      logger.error(error);
    } else {
      toast.success("arquivado");
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            pendentes
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${rows.length} aguardando aprovação`}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
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
                    {r.display_name ?? r.nickname ?? "—"}
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
