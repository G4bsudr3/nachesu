import { createClient } from "npm:@supabase/supabase-js@2.104.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { MigrationRequestSchema } from "./schema.ts";

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const objectUrl = (baseUrl: string, bucket: string, path: string) => {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond({ error: "unauthorized" }, 401);

  const sourceUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sourceServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const destinationUrl = Deno.env.get("DESTINATION_SUPABASE_URL");
  const destinationServiceKey = Deno.env.get("DESTINATION_SUPABASE_SERVICE_ROLE_KEY");
  if (!destinationUrl || !destinationServiceKey) {
    return respond({ error: "destination_not_configured" }, 500);
  }

  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(sourceUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return respond({ error: "unauthorized" }, 401);

  const source = createClient(sourceUrl, sourceServiceKey);
  const { data: adminRole } = await source
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) return respond({ error: "forbidden" }, 403);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return respond({ error: "invalid_json" }, 400);
  }
  const parsed = MigrationRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return respond({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, 400);
  }

  const { bucket, cursor, batch_size: batchSize, list_only: listOnly, skip_existing: skipExisting } = parsed.data;
  const { data: sourceBuckets, error: sourceBucketsError } = await source.storage.listBuckets();
  const sourceBucket = sourceBuckets?.find((item) => item.name === bucket);
  if (sourceBucketsError || !sourceBucket) return respond({ error: "source_bucket_not_found" }, 404);

  const destination = createClient(destinationUrl, destinationServiceKey);
  const { data: destinationBuckets, error: destinationBucketsError } = await destination.storage.listBuckets();
  if (destinationBucketsError) {
    return respond({ error: "destination_unreachable", details: destinationBucketsError.message }, 502);
  }
  if (!destinationBuckets?.some((item) => item.name === bucket)) {
    const { error: createError } = await destination.storage.createBucket(bucket, {
      public: sourceBucket.public,
      fileSizeLimit: sourceBucket.file_size_limit ?? undefined,
      allowedMimeTypes: sourceBucket.allowed_mime_types ?? undefined,
    });
    if (createError) return respond({ error: "destination_bucket_create_failed", details: createError.message }, 502);
  }

  async function listAll(prefix = ""): Promise<string[]> {
    const paths: string[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await source.storage.from(bucket).list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null) paths.push(...await listAll(path));
        else paths.push(path);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    return paths;
  }

  let paths: string[];
  try {
    paths = (await listAll()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch (error) {
    return respond({ error: "source_list_failed", details: String(error) }, 500);
  }
  if (listOnly) return respond({ bucket, total: paths.length, paths });
  const cursorIndex = cursor ? paths.findIndex((path) => path > cursor) : 0;
  const start = cursorIndex < 0 ? paths.length : cursorIndex;
  const batch = paths.slice(start, start + batchSize);
  const copied: string[] = [];
  const skipped: string[] = [];
  const failures: { path: string; error: string }[] = [];

  for (const path of batch) {
    try {
      if (skipExisting) {
        const head = await fetch(objectUrl(destinationUrl, bucket, path), {
          method: "HEAD",
          headers: { Authorization: `Bearer ${destinationServiceKey}`, apikey: destinationServiceKey },
        });
        if (head.ok) {
          skipped.push(path);
          continue;
        }
      }
      const { data: signed, error: signedError } = await source.storage.from(bucket).createSignedUrl(path, 3600);
      if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "signed_url_failed");
      const sourceResponse = await fetch(signed.signedUrl);
      if (!sourceResponse.ok || !sourceResponse.body) throw new Error(`source_download_${sourceResponse.status}`);
      const uploadResponse = await fetch(objectUrl(destinationUrl, bucket, path), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${destinationServiceKey}`,
          apikey: destinationServiceKey,
          "Content-Type": sourceResponse.headers.get("Content-Type") ?? "application/octet-stream",
          "x-upsert": "true",
        },
        body: sourceResponse.body,
      });
      if (!uploadResponse.ok) throw new Error(`destination_upload_${uploadResponse.status}: ${await uploadResponse.text()}`);
      copied.push(path);
    } catch (error) {
      failures.push({ path, error: String(error) });
    }
  }

  const lastPath = batch.at(-1);
  const done = start + batch.length >= paths.length;
  return respond({
    bucket,
    total: paths.length,
    copied,
    skipped,
    failures,
    processed_until: lastPath ?? cursor ?? null,
    next_cursor: done ? null : lastPath,
    done,
  });
});
