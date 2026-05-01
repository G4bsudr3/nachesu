import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_COLS = [
  "email",
  "whatsapp",
  "nome",
  "nickname",
  "ja_fez_perestroika",
  "quais_cursos_perestroika",
  "instagram",
  "trabalho",
  "cidade",
  "ctx_maior_trava",
  "ctx_experiencia_lovable",
  "ctx_expectativa",
];

// CSV parser simples com suporte a aspas duplas
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (cur !== "" || row.length > 0) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else {
        cur += c;
      }
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service role pra bypass RLS na checagem + upsert
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await req.text();
    if (!csvText.trim()) {
      return new Response(JSON.stringify({ error: "csv vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "csv sem dados" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    // valida que tem ao menos a coluna email
    if (!header.includes("email")) {
      return new Response(
        JSON.stringify({ error: "header precisa ter coluna 'email'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const colIdx: Record<string, number> = {};
    EXPECTED_COLS.forEach((c) => {
      colIdx[c] = header.indexOf(c);
    });

    let imported = 0;
    let updated = 0;
    const errors: { row: number; email: string; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length === 1 && r[0].trim() === "") continue;

      const get = (col: string) => {
        const idx = colIdx[col];
        if (idx < 0 || idx >= r.length) return null;
        const v = r[idx]?.trim();
        return v === "" ? null : v;
      };

      const email = get("email");
      if (!email) {
        errors.push({ row: i + 1, email: "", message: "email vazio" });
        continue;
      }

      // checa se já existe pra contar imported vs updated
      const { data: existing } = await adminClient
        .from("invited_participants")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      const payload = {
        email,
        whatsapp: get("whatsapp"),
        name: get("nome"),
        nickname: get("nickname"),
        ja_fez_perestroika: get("ja_fez_perestroika"),
        quais_cursos_perestroika: get("quais_cursos_perestroika"),
        instagram: get("instagram"),
        trabalho: get("trabalho"),
        cidade: get("cidade"),
        ctx_maior_trava: get("ctx_maior_trava"),
        ctx_experiencia_lovable: get("ctx_experiencia_lovable"),
        ctx_expectativa: get("ctx_expectativa"),
      };

      const { error: upsertErr } = await adminClient
        .from("invited_participants")
        .upsert(payload, { onConflict: "email" });

      if (upsertErr) {
        errors.push({ row: i + 1, email, message: upsertErr.message });
      } else if (existing) {
        updated++;
      } else {
        imported++;
      }
    }

    return new Response(
      JSON.stringify({ imported, updated, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[import-perestroika-spreadsheet] erro:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
