import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, HardDrive, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BlobWriter, HttpReader, TextReader, ZipWriter } from "@zip.js/zip.js";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-storage-zip`;

const PART_SIZE = 150;

type DryRun = {
  buckets: string[];
  total_files: number;
  per_bucket?: Record<string, number>;
  sample: string[];
};

type ExportManifest = {
  filename: string;
  files: { name: string; url: string }[];
  failures: string[];
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
      const qs = new URLSearchParams({ manifest: "1" });
      if (bucket) qs.set("bucket", bucket);
      if (part) {
        qs.set("part", String(part));
        qs.set("part_size", String(PART_SIZE));
      }
      const manifestRes = await fetch(`${FN_URL}?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!manifestRes.ok) throw new Error(await manifestRes.text());
      const manifest = (await manifestRes.json()) as ExportManifest;
      if (manifest.files.length === 0) throw new Error("essa parte não tem arquivos disponíveis");

      const zip = new ZipWriter(new BlobWriter("application/zip"), {
        level: 0,
        bufferedWrite: false,
      });
      const failures = [...manifest.failures];
      for (const file of manifest.files) {
        try {
          await zip.add(file.name, new HttpReader(file.url, {
            useRangeHeader: false,
            preventHeadRequest: true,
          }));
        } catch (downloadError) {
          failures.push(`${file.name} :: ${String(downloadError)}`);
        }
      }
      if (failures.length > 0) {
        await zip.add("_falhas.txt", new TextReader(failures.join("\n")));
      }
      const blob = await zip.close();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = manifest.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.success("zip concluído", {
        description: `${manifest.files.length - failures.length} arquivos incluídos.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "não consegui montar o arquivo");
    } finally {
      setBaixando(null);
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
              {baixando === "__all__:0" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              montar tudo num zip
            </Button>
            <p className="text-xs text-perestroika-preto/55">
              o navegador monta e valida o zip antes de salvar. mantenha esta página aberta.
              em bucket grande, baixe parte por parte abaixo para reduzir o uso de memória.
            </p>
          </div>

          <div className="rounded-2xl border border-perestroika-preto/15 divide-y divide-perestroika-preto/10">
            {data.buckets.map((b) => {
              const count = data.per_bucket?.[b] ?? 0;
              const parts = count > PART_SIZE ? Math.ceil(count / PART_SIZE) : 0;
              return (
                <div key={b} className="px-4 py-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-sm break-all">
                      {b}
                      {count > 0 && (
                        <span className="ml-2 text-perestroika-preto/50">
                          {count} arquivos
                        </span>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => baixar(b)}
                      disabled={baixando !== null}
                    >
                      {baixando === `${b}:0` ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      baixar bucket
                    </Button>
                  </div>

                  {parts > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-perestroika-preto/55">
                        bucket grande, recomendo baixar em {parts} partes de até {PART_SIZE}{" "}
                        arquivos cada.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: parts }, (_, i) => i + 1).map((p) => (
                          <Button
                            key={p}
                            variant="secondary"
                            size="sm"
                            onClick={() => baixar(b, p)}
                            disabled={baixando !== null}
                          >
                            {baixando === `${b}:${p}` ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : null}
                            parte {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminBackup;
