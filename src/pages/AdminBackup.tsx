import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, HardDrive, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-storage-zip`;

const PART_SIZE = 150;

type DryRun = {
  buckets: string[];
  total_files: number;
  per_bucket?: Record<string, number>;
  sample: string[];
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sessão expirada, entre de novo");
  return token;
}

function useInventory() {
  return useQuery({
    queryKey: ["storage-export-inventory"],
    queryFn: async (): Promise<DryRun> => {
      const token = await getToken();
      const res = await fetch(`${FN_URL}?dry_run=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

/** exportação dos arquivos de storage num zip único, estrutura idêntica à do projeto */
const AdminBackup = () => {
  const { data, isLoading, error } = useInventory();
  const [baixando, setBaixando] = useState<string | null>(null);

  const baixar = async (bucket?: string, part?: number) => {
    try {
      setBaixando(`${bucket ?? "__all__"}:${part ?? 0}`);
      const token = await getToken();
      const qs = new URLSearchParams({ token });
      if (bucket) qs.set("bucket", bucket);
      if (part) {
        qs.set("part", String(part));
        qs.set("part_size", String(PART_SIZE));
      }
      window.location.href = `${FN_URL}?${qs.toString()}`;
      toast.success("download iniciado", {
        description: "arquivos grandes podem levar alguns minutos pra começar.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "não consegui iniciar o download");
    } finally {
      setTimeout(() => setBaixando(null), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-body text-perestroika-preto">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">admin</p>
        <h1 className="font-display text-4xl uppercase leading-none">backup de arquivos</h1>
        <p className="text-sm text-perestroika-preto/65">
          baixa os arquivos de storage num zip único, com a mesma estrutura do projeto:
          bucket, pasta e nome de arquivo idênticos.
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-perestroika-preto/50">levantando o inventário…</p>
      )}

      {error && (
        <p className="text-sm text-perestroika-vermelho">
          não consegui listar os arquivos agora. recarregue a página e tente de novo.
        </p>
      )}

      {data && (
        <>
          <div className="rounded-2xl border border-perestroika-preto/15 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="w-4 h-4 text-perestroika-preto/50" />
              <span>
                {data.total_files} arquivos em {data.buckets.length} buckets
              </span>
            </div>
            <Button
              onClick={() => baixar()}
              disabled={baixando !== null}
              className="w-full sm:w-auto"
            >
              {baixando === "__all__" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              baixar tudo num zip
            </Button>
            <p className="text-xs text-perestroika-preto/55">
              o pacote completo passa de 4 gb. se a conexão cair no meio, baixe por bucket
              abaixo, o conteúdo e os caminhos continuam idênticos.
            </p>
          </div>

          <div className="rounded-2xl border border-perestroika-preto/15 divide-y divide-perestroika-preto/10">
            {data.buckets.map((b) => (
              <div
                key={b}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="font-mono text-sm break-all">{b}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => baixar(b)}
                  disabled={baixando !== null}
                >
                  {baixando === b ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  baixar bucket
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminBackup;
