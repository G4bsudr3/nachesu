import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// chunk simples por parágrafo, ~500 tokens (~2000 chars) com overlap
function chunkMarkdown(md: string, target = 2000, overlap = 200): string[] {
  const clean = md.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > target && current.length > 0) {
      chunks.push(current.trim());
      const tail = current.slice(-overlap);
      current = tail + "\n\n" + p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function normalizeEmbeddingModel(model: string | null | undefined): string {
  const cleanModel = (model || "gemini-embedding-001").replace(/^google\//, "").replace(/^models\//, "");
  if (cleanModel === "text-embedding-004" || cleanModel === "embedding-001") {
    return "gemini-embedding-001";
  }
  return cleanModel;
}

async function embed(text: string, model: string, taskType = "RETRIEVAL_DOCUMENT"): Promise<number[]> {
  const cleanModel = normalizeEmbeddingModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embedding falhou (${res.status}): ${t}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`embedding inválido: ${values?.length ?? 0} dimensões`);
  }
  return values;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "só admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docErr } = await admin
      .from("chora_bot_documents")
      .select("id, content_md")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error("documento não encontrado");

    const { data: settings } = await admin
      .from("chora_bot_settings")
      .select("embedding_model")
      .eq("id", 1)
      .single();
    const embeddingModel = normalizeEmbeddingModel(settings?.embedding_model);

    // limpa chunks antigos
    await admin.from("chora_bot_chunks").delete().eq("document_id", document_id);

    const chunks = chunkMarkdown(doc.content_md || "");
    if (chunks.length === 0) {
      await admin
        .from("chora_bot_documents")
        .update({ chunks_count: 0, indexed_at: new Date().toISOString() })
        .eq("id", document_id);
      return new Response(JSON.stringify({ chunks: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows: Array<{
      document_id: string;
      chunk_index: number;
      content: string;
      embedding: string;
      tokens: number;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      try {
        const emb = await embed(content, embeddingModel);
        rows.push({
          document_id,
          chunk_index: i,
          content,
          // pgvector aceita string '[...]'
          embedding: `[${emb.join(",")}]`,
          tokens: Math.ceil(content.length / 4),
        });
      } catch (e) {
        console.error(`chunk ${i} falhou:`, e);
        throw e;
      }
    }

    // insere em lotes de 20
    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      const { error } = await admin.from("chora_bot_chunks").insert(batch);
      if (error) throw error;
    }

    await admin
      .from("chora_bot_documents")
      .update({
        chunks_count: rows.length,
        indexed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    return new Response(JSON.stringify({ chunks: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
