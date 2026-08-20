import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAllCourses } from "@/hooks/useCourses";
import {
  useOverridesForUser,
  useSetOverride,
  useClearOverridesForUser,
  type UserOverride,
} from "@/hooks/useUserOverrides";

type AdminUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
};

type TreeData = {
  courses: Array<{
    id: string;
    title: string;
    published: boolean;
    trails: Array<{
      id: string;
      title: string;
      order_index: number;
      modules: Array<{
        id: string;
        number: number;
        title: string;
        published: boolean;
      }>;
    }>;
  }>;
};

const useStructureTree = () =>
  useQuery({
    queryKey: ["publicacao_tree"],
    staleTime: 30_000,
    queryFn: async (): Promise<TreeData> => {
      const [coursesRes, trailsRes, modulesRes] = await Promise.all([
        supabase.from("courses").select("id, title, published, order_index").order("order_index"),
        supabase.from("trails").select("id, title, order_index, course_id").order("order_index"),
        supabase
          .from("modules")
          .select("id, number, title, published, trail_id")
          .order("number"),
      ]);
      const courses = (coursesRes.data ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        published: !!c.published,
        trails: (trailsRes.data ?? [])
          .filter((t: any) => t.course_id === c.id)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            order_index: t.order_index,
            modules: (modulesRes.data ?? [])
              .filter((m: any) => m.trail_id === t.id)
              .map((m: any) => ({
                id: m.id,
                number: m.number,
                title: m.title,
                published: !!m.published,
              })),
          })),
      }));
      return { courses };
    },
  });

const useAdminUsers = () =>
  useQuery({
    queryKey: ["admin_users_for_publicacao"],
    staleTime: 60_000,
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []).map((u: any) => ({
        user_id: u.user_id,
        email: u.email,
        display_name: u.display_name,
        nickname: u.nickname,
      }));
    },
  });

// ============= Tab: módulos (árvore) =============
const TreeTab = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useStructureTree();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openTrails, setOpenTrails] = useState<Record<string, boolean>>({});

  const toggleModule = async (id: string, next: boolean) => {
    setSavingId(id);
    const { error } = await supabase.from("modules").update({ published: next }).eq("id", id);
    setSavingId(null);
    if (error) {
      console.error("[publicacao] toggleModule falhou", error);
      return toast.error(`erro ao publicar módulo: ${error.message}`, { duration: 12000 });
    }
    qc.invalidateQueries({ queryKey: ["publicacao_tree"] });
    qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
    toast.success(next ? "módulo publicado" : "módulo despublicado");
  };

  const toggleCourse = async (id: string, next: boolean) => {
    setSavingId(id);
    const { error } = await supabase.from("courses").update({ published: next }).eq("id", id);
    setSavingId(null);
    if (error) {
      console.error("[publicacao] toggleCourse falhou", error);
      return toast.error(`erro ao publicar eletiva: ${error.message}`, { duration: 12000 });
    }
    qc.invalidateQueries({ queryKey: ["publicacao_tree"] });
    toast.success(next ? "eletiva publicada" : "eletiva despublicada");
  };

  const bulkTrail = async (trailId: string, moduleIds: string[], next: boolean) => {
    setSavingId(trailId);
    // itera 1-a-1 pra saber qual módulo falhou (o bulk .in() aborta tudo no primeiro erro)
    const failures: Array<{ id: string; message: string }> = [];
    for (const id of moduleIds) {
      const { error } = await supabase.from("modules").update({ published: next }).eq("id", id);
      if (error) {
        console.error("[publicacao] bulkTrail falhou em", id, error);
        failures.push({ id, message: error.message });
      }
    }
    setSavingId(null);
    qc.invalidateQueries({ queryKey: ["publicacao_tree"] });
    qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
    if (failures.length > 0) {
      const first = failures[0];
      return toast.error(
        `${failures.length}/${moduleIds.length} módulos falharam. primeiro: ${first.message}`,
        { duration: 15000 },
      );
    }
    toast.success(next ? "trilha publicada" : "trilha despublicada");
  };

  if (isLoading) return <p className="text-sm text-perestroika-preto/50">carregando estrutura…</p>;

  return (
    <div className="space-y-4">
      {data?.courses.map((c) => {
        const totalModules = c.trails.reduce((acc, t) => acc + t.modules.length, 0);
        const publishedModules = c.trails.reduce(
          (acc, t) => acc + t.modules.filter((m) => m.published).length,
          0,
        );
        const courseOpen = openCourses[c.id] ?? true;
        return (
          <div key={c.id} className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-perestroika-preto/15">
              <button
                type="button"
                onClick={() => setOpenCourses((s) => ({ ...s, [c.id]: !courseOpen }))}
                className="p-1 hover:bg-perestroika-preto/5 rounded"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${courseOpen ? "" : "-rotate-90"}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg uppercase truncate">{c.title}</p>
                <p className="text-xs text-perestroika-preto/55">
                  {publishedModules}/{totalModules} módulos publicados
                </p>
              </div>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/65">
                eletiva pública
                <Switch
                  checked={c.published}
                  disabled={savingId === c.id}
                  onCheckedChange={(v) => toggleCourse(c.id, v)}
                />
              </label>
            </div>
            {courseOpen && (
              <div className="px-4 py-3 space-y-3">
                {c.trails.map((t) => {
                  const trailOpen = openTrails[t.id] ?? false;
                  const tPublished = t.modules.filter((m) => m.published).length;
                  return (
                    <div key={t.id} className="rounded-xl bg-perestroika-bege/40 p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenTrails((s) => ({ ...s, [t.id]: !trailOpen }))}
                          className="p-1 hover:bg-perestroika-preto/5 rounded"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${trailOpen ? "" : "-rotate-90"}`}
                          />
                        </button>
                        <p className="flex-1 font-medium text-sm">
                          trilha {t.order_index} · {t.title}
                        </p>
                        <span className="text-[10px] uppercase text-perestroika-preto/50">
                          {tPublished}/{t.modules.length}
                        </span>
                        <button
                          type="button"
                          disabled={savingId === t.id || t.modules.length === 0}
                          onClick={() =>
                            bulkTrail(
                              t.id,
                              t.modules.map((m) => m.id),
                              tPublished < t.modules.length,
                            )
                          }
                          className="text-[10px] uppercase tracking-wide rounded border border-perestroika-preto/15 px-2 py-1 hover:bg-perestroika-preto/5"
                        >
                          {tPublished < t.modules.length ? "publicar tudo" : "despublicar tudo"}
                        </button>
                      </div>
                      {trailOpen && (
                        <ul className="mt-2 divide-y divide-perestroika-preto/10">
                          {t.modules.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center justify-between gap-3 py-2 text-sm"
                            >
                              <span className="truncate">
                                <span className="text-perestroika-preto/50">m{m.number}</span>{" "}
                                {m.title}
                              </span>
                              <Switch
                                checked={m.published}
                                disabled={savingId === m.id}
                                onCheckedChange={(v) => toggleModule(m.id, v)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============= Tab: por estudante =============
const tristateLabel = (override: UserOverride | undefined): string => {
  if (!override) return "padrão";
  return override.visible ? "forçado visível" : "forçado oculto";
};

const TriStateRow = ({
  label,
  override,
  onSet,
}: {
  label: string;
  override: UserOverride | undefined;
  onSet: (v: boolean | null) => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-2 text-sm border-b border-perestroika-preto/15 last:border-0">
    <span className="truncate flex-1">{label}</span>
    <span className="text-[10px] uppercase text-perestroika-preto/45 w-32 text-right">
      {tristateLabel(override)}
    </span>
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onSet(null)}
        className={`px-2 py-1 text-[10px] uppercase rounded border ${
          !override
            ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
            : "border-perestroika-preto/15 hover:bg-perestroika-preto/5"
        }`}
      >
        padrão
      </button>
      <button
        type="button"
        onClick={() => onSet(true)}
        className={`px-2 py-1 text-[10px] uppercase rounded border ${
          override?.visible === true
            ? "bg-green-700 text-white border-green-700"
            : "border-perestroika-preto/15 hover:bg-perestroika-preto/5"
        }`}
      >
        <Eye className="w-3 h-3 inline" /> ver
      </button>
      <button
        type="button"
        onClick={() => onSet(false)}
        className={`px-2 py-1 text-[10px] uppercase rounded border ${
          override?.visible === false
            ? "bg-red-700 text-white border-red-700"
            : "border-perestroika-preto/15 hover:bg-perestroika-preto/5"
        }`}
      >
        <EyeOff className="w-3 h-3 inline" /> ocultar
      </button>
    </div>
  </div>
);

const PerUserTab = () => {
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const { data: tree } = useStructureTree();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: overrides = [] } = useOverridesForUser(selected);
  const setOverride = useSetOverride();
  const clearAll = useClearOverridesForUser();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(term) ||
          (u.display_name ?? "").toLowerCase().includes(term) ||
          (u.nickname ?? "").toLowerCase().includes(term),
      )
      .slice(0, 50);
  }, [users, q]);

  const findOverride = (scope: "module" | "trail" | "course", id: string) =>
    overrides.find(
      (o) =>
        o.scope === scope &&
        (scope === "module" ? o.module_id === id : scope === "trail" ? o.trail_id === id : o.course_id === id),
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <aside className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-perestroika-preto/60" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar estudante…"
            className="pl-7 h-9 text-sm"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 divide-y divide-perestroika-preto/5">
          {usersLoading && <li className="p-3 text-xs text-perestroika-preto/45">carregando…</li>}
          {filtered.map((u) => (
            <li key={u.user_id}>
              <button
                type="button"
                onClick={() => setSelected(u.user_id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-perestroika-preto/5 ${
                  selected === u.user_id ? "bg-perestroika-preto/10" : ""
                }`}
              >
                <p className="font-medium truncate">
                  {u.display_name ?? u.nickname ?? u.email}
                </p>
                <p className="text-[10px] text-perestroika-preto/55 truncate">{u.email}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4 min-h-[40vh]">
        {!selected && (
          <p className="text-sm text-perestroika-preto/55">
            escolhe um estudante na lista pra gerenciar visibilidade.
          </p>
        )}
        {selected && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wide text-perestroika-preto/55">
                overrides ({overrides.length})
              </p>
              <button
                type="button"
                onClick={() => clearAll.mutate(selected)}
                disabled={clearAll.isPending || overrides.length === 0}
                className="text-[11px] uppercase tracking-wide underline disabled:opacity-40"
              >
                limpar todos
              </button>
            </div>

            <div className="space-y-6">
              {tree?.courses.map((c) => (
                <div key={c.id}>
                  <p className="font-display uppercase text-sm mb-2">{c.title}</p>
                  <TriStateRow
                    label={`eletiva inteira: ${c.title}`}
                    override={findOverride("course", c.id)}
                    onSet={(v) =>
                      setOverride.mutate({
                        user_id: selected,
                        scope: "course",
                        target_id: c.id,
                        visible: v,
                      })
                    }
                  />
                  {c.trails.map((t) => (
                    <div key={t.id} className="ml-4 mt-2">
                      <TriStateRow
                        label={`trilha ${t.order_index}: ${t.title}`}
                        override={findOverride("trail", t.id)}
                        onSet={(v) =>
                          setOverride.mutate({
                            user_id: selected,
                            scope: "trail",
                            target_id: t.id,
                            visible: v,
                          })
                        }
                      />
                      <div className="ml-4">
                        {t.modules.map((m) => (
                          <TriStateRow
                            key={m.id}
                            label={`m${m.number} · ${m.title}`}
                            override={findOverride("module", m.id)}
                            onSet={(v) =>
                              setOverride.mutate({
                                user_id: selected,
                                scope: "module",
                                target_id: m.id,
                                visible: v,
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export const AdminPublicacao = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-1">
        <h2 className="font-display text-3xl uppercase tracking-tight">
          publicação & visibilidade
        </h2>
        <p className="text-sm text-perestroika-preto/55">
          controle quais eletivas, trilhas e módulos ficam visíveis. overrides por estudante sobrepõem a regra padrão.
        </p>
      </header>

      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">módulos</TabsTrigger>
          <TabsTrigger value="user">por estudante</TabsTrigger>
        </TabsList>
        <TabsContent value="tree" className="mt-4">
          <TreeTab />
        </TabsContent>
        <TabsContent value="user" className="mt-4">
          <PerUserTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
