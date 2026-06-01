import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  id: number;
  system_prompt: string;
  model: string;
  embedding_model: string;
  welcome_message: string;
  cutoff_at: string;
  enabled: boolean;
  match_count: number;
  similarity_threshold: number;
};

type DocRow = {
  id: string;
  title: string;
  content_md: string;
  published: boolean;
  indexed_at: string | null;
  chunks_count: number;
  created_at: string;
};

type ConvRow = {
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
  message_count: number;
  total_cost: number;
};

const formatBRDate = (iso: string | null) => {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

// ============ CONFIG TAB ============
const ConfigTab = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    supabase
      .from("chora_bot_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setSettings(data as Settings);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("chora_bot_settings")
      .update({
        system_prompt: settings.system_prompt,
        model: settings.model,
        welcome_message: settings.welcome_message,
        cutoff_at: settings.cutoff_at,
        enabled: settings.enabled,
        match_count: settings.match_count,
        similarity_threshold: settings.similarity_threshold,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error("não consegui salvar");
    else toast.success("salvo 🤙");
  };

  const regenerate = async () => {
    if (!settings) return;
    setRegenerating(true);
    const { data, error } = await supabase.functions.invoke("chora-bot-suggest-prompt", {
      body: { context_brief: "" },
    });
    setRegenerating(false);
    if (error || !data?.prompt) {
      toast.error("não rolou regerar");
      return;
    }
    setSettings({ ...settings, system_prompt: data.prompt });
    toast.success("prompt regenerado, revisa e salva");
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-perestroika-preto/60">carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between p-4 bg-perestroika-preto/5 rounded-lg">
        <div>
          <Label className="text-base font-medium">chora bot ativo</Label>
          <p className="text-sm text-perestroika-preto/60">desliga aqui se quiser pausar manualmente</p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
        />
      </div>

      <div>
        <Label>encerra em (após essa data nenhuma ia é consumida)</Label>
        <Input
          type="datetime-local"
          value={new Date(settings.cutoff_at).toISOString().slice(0, 16)}
          onChange={(e) =>
            setSettings({ ...settings, cutoff_at: new Date(e.target.value).toISOString() })
          }
          className="mt-2"
        />
      </div>

      <div>
        <Label>modelo de geração</Label>
        <Input
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          className="mt-2 font-mono text-sm"
          placeholder="google/gemini-2.5-flash"
        />
        <p className="text-xs text-perestroika-preto/50 mt-1">
          recomendado: google/gemini-2.5-flash (melhor custo)
        </p>
      </div>

      <div>
        <Label>mensagem de boas-vindas</Label>
        <Textarea
          value={settings.welcome_message}
          onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
          className="mt-2"
          rows={2}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>system prompt</Label>
          <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            regenerar default
          </Button>
        </div>
        <Textarea
          value={settings.system_prompt}
          onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
          className="font-mono text-xs"
          rows={20}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>chunks por busca</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={settings.match_count}
            onChange={(e) => setSettings({ ...settings, match_count: Number(e.target.value) })}
            className="mt-2"
          />
        </div>
        <div>
          <Label>limite de similaridade (0-1)</Label>
          <Input
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={settings.similarity_threshold}
            onChange={(e) =>
              setSettings({ ...settings, similarity_threshold: Number(e.target.value) })
            }
            className="mt-2"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-perestroika-preto text-perestroika-bege">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        salvar configuração
      </Button>
    </div>
  );
};

// ============ DOCS TAB ============
const DocsTab = () => {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DocRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chora_bot_documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as DocRow[]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const newDoc = () => {
    setEditing({
      id: "",
      title: "",
      content_md: "",
      published: true,
      indexed_at: null,
      chunks_count: 0,
      created_at: "",
    });
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setEditing({
      id: "",
      title: file.name.replace(/\.md$/i, ""),
      content_md: text,
      published: true,
      indexed_at: null,
      chunks_count: 0,
      created_at: "",
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content_md.trim()) {
      toast.error("título e conteúdo obrigatórios");
      return;
    }
    setBusy("save");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(null);
      toast.error("login expirou");
      return;
    }
    let docId = editing.id;
    if (!docId) {
      const { data, error } = await supabase
        .from("chora_bot_documents")
        .insert({
          title: editing.title,
          content_md: editing.content_md,
          published: editing.published,
          source_kind: "md_paste",
          created_by: userData.user.id,
        })
        .select("id")
        .single();
      if (error || !data) {
        setBusy(null);
        toast.error("não consegui salvar");
        return;
      }
      docId = data.id;
    } else {
      const { error } = await supabase
        .from("chora_bot_documents")
        .update({
          title: editing.title,
          content_md: editing.content_md,
          published: editing.published,
        })
        .eq("id", docId);
      if (error) {
        setBusy(null);
        toast.error("não consegui salvar");
        return;
      }
    }

    // indexa
    setBusy("index");
    const { data: ingestData, error: ingestErr } = await supabase.functions.invoke(
      "chora-bot-ingest",
      { body: { document_id: docId } },
    );
    setBusy(null);
    if (ingestErr) {
      toast.error("salvou mas não indexou: " + ingestErr.message);
    } else {
      toast.success(`indexado em ${ingestData?.chunks ?? 0} pedaços 🔥`);
    }
    setEditing(null);
    reload();
  };

  const reindex = async (id: string) => {
    setBusy("idx-" + id);
    const { data, error } = await supabase.functions.invoke("chora-bot-ingest", {
      body: { document_id: id },
    });
    setBusy(null);
    if (error) toast.error("falhou");
    else toast.success(`reindexado: ${data?.chunks ?? 0} chunks`);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("apagar de vez?")) return;
    await supabase.from("chora_bot_documents").delete().eq("id", id);
    reload();
  };

  if (editing) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div>
          <Label>título</Label>
          <Input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="mt-2"
          />
        </div>
        <div>
          <Label>conteúdo markdown</Label>
          <Textarea
            value={editing.content_md}
            onChange={(e) => setEditing({ ...editing, content_md: e.target.value })}
            className="mt-2 font-mono text-sm"
            rows={20}
          />
          <p className="text-xs text-perestroika-preto/50 mt-1">
            {editing.content_md.length} caracteres • ~{Math.ceil(editing.content_md.length / 4)} tokens
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={editing.published}
            onCheckedChange={(v) => setEditing({ ...editing, published: v })}
          />
          <Label>publicado (chora bot vai usar)</Label>
        </div>
        <div className="flex gap-3">
          <Button onClick={save} disabled={!!busy} className="bg-perestroika-preto text-perestroika-bege">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {busy === "index" ? "indexando..." : "salvar e indexar"}
          </Button>
          <Button variant="outline" onClick={() => setEditing(null)} disabled={!!busy}>
            cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={newDoc} className="bg-perestroika-preto text-perestroika-bege">
          novo documento
        </Button>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button variant="outline" type="button" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              subir .md
            </span>
          </Button>
        </label>
      </div>

      {loading ? (
        <div className="py-12 text-center text-perestroika-preto/60">carregando...</div>
      ) : docs.length === 0 ? (
        <div className="py-12 text-center text-perestroika-preto/60">
          nenhum documento ainda. sobe um .md ou cola texto.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div
              key={d.id}
              className="p-4 bg-perestroika-preto/5 rounded-lg flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{d.title}</span>
                  {!d.published && <Badge variant="outline" className="text-xs">rascunho</Badge>}
                </div>
                <p className="text-xs text-perestroika-preto/60 mt-1">
                  {d.chunks_count} chunks • indexado {formatBRDate(d.indexed_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => reindex(d.id)} disabled={busy === "idx-" + d.id}>
                  {busy === "idx-" + d.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    supabase
                      .from("chora_bot_documents")
                      .select("*")
                      .eq("id", d.id)
                      .single()
                      .then(({ data }) => data && setEditing(data as DocRow));
                  }}
                >
                  editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(d.id)}>
                  <Trash2 className="w-4 h-4 text-perestroika-vermelho" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ CONVERSATIONS TAB ============
const ConversationsTab = () => {
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: convData } = await supabase
        .from("chora_bot_conversations")
        .select("id, user_id, title, updated_at")
        .order("updated_at", { ascending: false });

      const { data: msgsAgg } = await supabase
        .from("chora_bot_messages")
        .select("conversation_id, cost_usd_estimate");

      const byConv = new Map<string, { count: number; cost: number }>();
      let cost = 0;
      let count = 0;
      (msgsAgg ?? []).forEach((m: { conversation_id: string; cost_usd_estimate: number }) => {
        const v = byConv.get(m.conversation_id) ?? { count: 0, cost: 0 };
        v.count += 1;
        v.cost += Number(m.cost_usd_estimate ?? 0);
        byConv.set(m.conversation_id, v);
        cost += Number(m.cost_usd_estimate ?? 0);
        count += 1;
      });

      const enriched = (convData ?? []).map((c) => ({
        ...c,
        message_count: byConv.get(c.id)?.count ?? 0,
        total_cost: byConv.get(c.id)?.cost ?? 0,
      }));

      setConvs(enriched as ConvRow[]);
      setTotalCost(cost);
      setTotalMsgs(count);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-perestroika-preto/5 rounded-lg">
          <p className="text-xs uppercase text-perestroika-preto/60">mensagens totais</p>
          <p className="text-3xl font-display">{totalMsgs}</p>
        </div>
        <div className="p-4 bg-perestroika-preto/5 rounded-lg">
          <p className="text-xs uppercase text-perestroika-preto/60">custo estimado</p>
          <p className="text-3xl font-display">US$ {totalCost.toFixed(3)}</p>
        </div>
        <div className="p-4 bg-perestroika-preto/5 rounded-lg">
          <p className="text-xs uppercase text-perestroika-preto/60">conversas</p>
          <p className="text-3xl font-display">{convs.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-perestroika-preto/60">carregando...</div>
      ) : convs.length === 0 ? (
        <div className="py-12 text-center text-perestroika-preto/60">nenhuma conversa ainda</div>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => (
            <div key={c.id} className="p-3 bg-perestroika-preto/5 rounded flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.title}</p>
                <p className="text-xs text-perestroika-preto/60">
                  {c.message_count} msgs • {formatBRDate(c.updated_at)} • US$ {c.total_cost.toFixed(4)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ MAIN ============
export const AdminChoraBot = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display uppercase text-4xl sm:text-5xl leading-none">
          chora bot
        </h1>
        <p className="text-perestroika-preto/60 mt-2">
          assistente pós evento com rag. ativo até 26/05/2026.
        </p>
      </div>
      <Tabs defaultValue="config">
        <TabsList className="bg-perestroika-preto/5 mb-6">
          <TabsTrigger value="config">configuração</TabsTrigger>
          <TabsTrigger value="docs">base de conhecimento</TabsTrigger>
          <TabsTrigger value="conversations">conversas & uso</TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="docs">
          <DocsTab />
        </TabsContent>
        <TabsContent value="conversations">
          <ConversationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
