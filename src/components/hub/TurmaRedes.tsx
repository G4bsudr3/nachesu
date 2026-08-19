import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Instagram, Linkedin, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTurmaRedes, type TurmaPessoa } from "@/features/hub/useTurmaRedes";
import { instagramUrl, linkedinDisplay } from "@/lib/socialHandles";

const FALLBACK_COLORS = [
  "bg-perestroika-laranja",
  "bg-perestroika-vermelho",
  "bg-perestroika-rosa",
  "bg-perestroika-azul",
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Filter = "todos" | "instagram" | "linkedin";

function PersonCard({ p, isMe }: { p: TurmaPessoa; isMe: boolean }) {
  const hasIg = Boolean(p.instagram);
  const hasLi = Boolean(p.linkedin);
  const hasAny = hasIg || hasLi;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-perestroika-preto/12 bg-perestroika-bege/55 p-4 transition-colors hover:border-perestroika-preto/30">
      <header className="flex items-center gap-3 min-w-0">
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.display_name}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base uppercase text-perestroika-bege ${colorFor(p.display_name)}`}
            aria-hidden
          >
            {initials(p.display_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm font-semibold leading-tight">
            {p.display_name}
            {isMe && (
              <span className="ml-2 align-middle rounded-full bg-perestroika-preto px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-perestroika-bege">
                tu
              </span>
            )}
          </p>
          {p.nickname && p.nickname.toLowerCase() !== p.display_name.toLowerCase() && (
            <p className="truncate font-body text-xs text-perestroika-preto/55">
              @{p.nickname}
            </p>
          )}
        </div>
      </header>

      {hasAny ? (
        <div className="flex flex-wrap gap-1.5">
          {hasIg && (
            <a
              href={instagramUrl(p.instagram!)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`instagram de ${p.display_name}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-perestroika-laranja via-perestroika-vermelho to-perestroika-rosa px-3 py-1.5 font-body text-xs font-medium text-perestroika-bege transition-transform hover:scale-[1.03]"
            >
              <Instagram className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-[140px] truncate">@{p.instagram}</span>
            </a>
          )}
          {hasLi && (
            <a
              href={p.linkedin!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`linkedin de ${p.display_name}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-perestroika-preto px-3 py-1.5 font-body text-xs font-medium text-perestroika-preto transition-colors hover:bg-perestroika-preto hover:text-perestroika-bege"
            >
              <Linkedin className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-[140px] truncate">{linkedinDisplay(p.linkedin!)}</span>
            </a>
          )}
        </div>
      ) : isMe ? (
        <Link
          to="/app/conta"
          className="inline-flex w-full min-h-9 items-center justify-center gap-1.5 rounded-full border border-dashed border-perestroika-preto/40 px-3 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-preto/70 transition-colors hover:border-perestroika-preto hover:text-perestroika-preto"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          adiciona tuas redes
        </Link>
      ) : (
        <p className="font-body text-xs italic text-perestroika-preto/60">
          ainda sem rede aqui
        </p>
      )}
    </article>
  );
}

export function TurmaRedes() {
  const { user } = useAuth();
  const { people, loading } = useTurmaRedes();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const stats = useMemo(() => {
    const withIg = people.filter((p) => p.instagram).length;
    const withLi = people.filter((p) => p.linkedin).length;
    const withAny = people.filter((p) => p.instagram || p.linkedin).length;
    return { withIg, withLi, withAny, total: people.length };
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (filter === "instagram" && !p.instagram) return false;
      if (filter === "linkedin" && !p.linkedin) return false;
      if (!q) return true;
      const hay = [
        p.display_name,
        p.nickname ?? "",
        p.instagram ?? "",
        p.linkedin ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [people, filter, query]);

  // ordena: quem tem rede primeiro
  const ordered = useMemo(() => {
    const withSocial = filtered.filter((p) => p.instagram || p.linkedin);
    const without = filtered.filter((p) => !p.instagram && !p.linkedin);
    return { withSocial, without };
  }, [filtered]);

  const filterPills: { id: Filter; label: string }[] = [
    { id: "todos", label: "todos" },
    { id: "instagram", label: "instagram" },
    { id: "linkedin", label: "linkedin" },
  ];

  return (
    <section aria-labelledby="turma-redes-title" className="space-y-5">
      <div>
        <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
          fica fácil se achar
        </p>
        <h2
          id="turma-redes-title"
          className="font-display text-3xl uppercase leading-none sm:text-4xl"
        >
          redes da turma
        </h2>
        <p className="mt-3 font-body text-sm text-perestroika-preto/70">
          {stats.withAny} de {stats.total} já com rede preenchida.{" "}
          <Link
            to="/app/conta"
            className="underline decoration-perestroika-laranja decoration-2 underline-offset-4 hover:text-perestroika-preto"
          >
            adicionar a tua
          </Link>
        </p>
      </div>

      {/* search + filtro */}
      <div className="space-y-3 rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/40 p-3">
        <label className="flex items-center gap-2 rounded-xl border border-perestroika-preto/15 bg-perestroika-bege px-3 focus-within:border-perestroika-preto">
          <Search className="h-4 w-4 shrink-0 text-perestroika-preto/50" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="busca por nome, apelido ou handle"
            aria-label="buscar pessoa"
            className="h-11 flex-1 bg-transparent font-body text-sm placeholder:text-perestroika-preto/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="limpar busca"
              className="rounded-full p-1 text-perestroika-preto/50 hover:text-perestroika-preto"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap gap-1.5">
          {filterPills.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`min-h-9 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-perestroika-preto text-perestroika-bege"
                    : "border border-perestroika-preto/20 text-perestroika-preto/70 hover:border-perestroika-preto hover:text-perestroika-preto"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-perestroika-preto/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 p-8 text-center">
          <p className="font-body text-sm text-perestroika-preto/65">
            ninguém aqui com esse nome. tenta o nickname ou o handle.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.withSocial.map((p) => (
              <PersonCard key={p.user_id} p={p} isMe={user?.id === p.user_id} />
            ))}
          </div>

          {ordered.without.length > 0 && filter === "todos" && !query && (
            <>
              <div className="flex items-center gap-3 pt-4">
                <div className="h-px flex-1 bg-perestroika-preto/10" />
                <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/45">
                  ainda sem rede
                </p>
                <div className="h-px flex-1 bg-perestroika-preto/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.without.map((p) => (
                  <PersonCard key={p.user_id} p={p} isMe={user?.id === p.user_id} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
