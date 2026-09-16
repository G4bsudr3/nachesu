// Exporta todos os arquivos de storage num zip único, preservando a estrutura
// exata: <bucket>/<pasta>/<arquivo>. Só admin autenticado pode chamar.
//
// GET /export-storage-zip?token=<access_token>[&bucket=radar-evidences]
// (o token também pode vir no header Authorization: Bearer ...)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  ZipWriter,
  HttpReader,
  configure,
} from "https://esm.sh/@zip.js/zip.js@2.7.45";

configure({ useWebWorkers: false });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const headerToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const token = headerToken || url.searchParams.get("token") || "";
  if (!token) return json({ error: "missing_auth", message: "faltou autenticação" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "invalid_token", message: "sessão inválida" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdmin) {
    return json({ error: "forbidden", message: "só admin pode exportar" }, 403);
  }

  const onlyBucket = url.searchParams.get("bucket");
  const dryRun = url.searchParams.get("dry_run") === "1";

  const { data: buckets, error: bucketsErr } = await admin.storage.listBuckets();
  if (bucketsErr || !buckets) {
    return json({ error: "list_buckets_failed", message: bucketsErr?.message }, 500);
  }

  // Lista recursiva de todos os objetos, preservando o caminho completo.
  async function listAll(bucket: string, prefix = ""): Promise<string[]> {
    const out: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    for (;;) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null) {
          out.push(...(await listAll(bucket, path)));
        } else {
          out.push(path);
        }
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    return out;
  }

  const targets = buckets
    .map((b) => b.name)
    .filter((name) => (onlyBucket ? name === onlyBucket : true));

  const files: { bucket: string; path: string }[] = [];
  try {
    for (const bucket of targets) {
      for (const path of await listAll(bucket)) files.push({ bucket, path });
    }
  } catch (e) {
    return json({ error: "list_failed", message: String(e) }, 500);
  }

  if (dryRun) {
    return json({
      buckets: targets,
      total_files: files.length,
      sample: files.slice(0, 20).map((f) => `${f.bucket}/${f.path}`),
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = onlyBucket
    ? `storage-${onlyBucket}-${stamp}.zip`
    : `storage-nachesu-${stamp}.zip`;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  (async () => {
    // level 0 = store: sem compressão, streaming direto, uso mínimo de memória.
    const zip = new ZipWriter(writable, { zip64: true, level: 0, bufferedWrite: false });
    const failures: string[] = [];
    for (const { bucket, path } of files) {
      try {
        const { data: signed, error } = await admin.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60);
        if (error || !signed?.signedUrl) throw new Error(error?.message ?? "sem url");
        await zip.add(`${bucket}/${path}`, new HttpReader(signed.signedUrl, {
          useRangeHeader: false,
          preventHeadRequest: true,
        }));
      } catch (e) {
        failures.push(`${bucket}/${path} :: ${String(e)}`);
      }
    }
    if (failures.length > 0) {
      await zip.add(
        "_falhas.txt",
        new (await import("https://esm.sh/@zip.js/zip.js@2.7.45")).TextReader(
          failures.join("\n"),
        ),
      );
    }
    await zip.close();
  })().catch((e) => {
    console.error("export-storage-zip falhou", e);
    try {
      writable.abort(e);
    } catch (_) {
      // stream já fechado
    }
  });

  return new Response(readable, {
    headers: {
      ...cors,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
