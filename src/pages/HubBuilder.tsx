import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useBuilderProfile } from "@/features/hub/useBuilderProfile";
import { useReactions, HUB_EMOJIS, type HubEmoji } from "@/features/hub/useReactions";
import { useComments } from "@/features/hub/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { ARCHETYPE_TOKENS, getArchetypeView } from "@/components/carta/cartaTokens";
import { CartaCompleta } from "@/components/carta/CartaCompleta";
import { detectGender } from "@/lib/gender";
import { toast } from "sonner";

const ReactionBar = ({ submissionId }: { submissionId: string }) => {
  const { user } = useAuth();
  const { state, toggle } = useReactions(submissionId);

  return (
    <div className="flex flex-wrap gap-1.5">
      {HUB_EMOJIS.map((emoji) => {
        const count = state.counts[emoji];
        const mine = state.mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={!user}
            onClick={() => toggle(emoji)}
            aria-pressed={mine}
            aria-label={`reagir com ${emoji}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-body text-sm transition-all ${
              mine
                ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                : "border-perestroika-preto/15 bg-white/60 text-perestroika-preto/80 hover:border-perestroika-preto/40"
            } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

const CommentMural = ({ submissionId }: { submissionId: string }) => {
  const { user } = useAuth();
  const { comments, myComment, loading, saving, upsert, remove } = useComments(submissionId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (myComment && !editing) setDraft(myComment.body);
    if (!myComment) setDraft("");
  }, [myComment, editing]);

  const handleSubmit = async () => {
    const res = await upsert({ body: draft });
    if (!res.ok) {
      toast.error(res.error ?? "não rolou");
      return;
    }
    setEditing(false);
  };

  const remaining = 280 - draft.length;

  return (
    <div className="space-y-3">
      <h4 className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60">
        comentários
      </h4>

      {/* lista */}
      {loading ? (
        <div className="h-12 animate-pulse rounded-xl bg-perestroika-preto/5" />
      ) : comments.length === 0 ? (
        <p className="font-body text-sm italic text-perestroika-preto/50">
          ninguém comentou ainda. inaugura aí.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const name = c.author.nickname || c.author.display_name || "builder";
            const initial = (name[0] ?? "?").toUpperCase();
            const isMe = user?.id === c.user_id;
            return (
              <li
                key={c.id}
                className="flex gap-3 rounded-2xl border border-perestroika-preto/10 bg-white/50 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-perestroika-laranja via-perestroika-rosa to-perestroika-azul font-display text-sm uppercase text-perestroika-bege">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {c.author.slug ? (
                      <Link
                        to={`/app/hub/builder/${c.author.slug}`}
                        className="font-body text-sm font-semibold text-perestroika-preto hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-body text-sm font-semibold text-perestroika-preto">
                        {name}
                      </span>
                    )}
                    {isMe && (
                      <span className="font-body text-[10px] uppercase tracking-wide text-perestroika-preto/40">
                        você
                      </span>
                    )}
                    {c.edited && (
                      <span className="font-body text-[10px] italic text-perestroika-preto/40">
                        editado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words font-body text-sm text-perestroika-preto/85">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* meu input */}
      {user && (myComment ? editing || !myComment : true) && (
        <div className="space-y-1.5">
          {!myComment || editing ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 280))}
                placeholder={myComment ? "edita seu comentário" : "deixa um recado curto pro builder"}
                rows={2}
                className="w-full resize-none rounded-2xl border border-perestroika-preto/15 bg-white/70 p-3 font-body text-sm placeholder:text-perestroika-preto/40 focus-visible:border-perestroika-preto focus-visible:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-body text-xs ${
                    remaining < 20 ? "text-perestroika-vermelho" : "text-perestroika-preto/40"
                  }`}
                >
                  {remaining}
                </span>
                <div className="flex gap-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setDraft(myComment?.body ?? "");
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
                    >
                      <X className="h-3 w-3" /> cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving || draft.trim().length === 0}
                    className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto px-3 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:bg-perestroika-laranja hover:text-perestroika-preto disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {myComment ? "salvar" : "comentar"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {user && myComment && !editing && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <Pencil className="h-3 w-3" /> editar meu comentário
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("apagar seu comentário?")) remove();
            }}
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-vermelho"
          >
            <Trash2 className="h-3 w-3" /> apagar
          </button>
        </div>
      )}
    </div>
  );
};

const HubBuilder = () => {
  const { slug } = useParams<{ slug: string }>();
  const { profile, loading, error } = useBuilderProfile(slug);

  if (loading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege">
        <PageHeader showLogo logoLink="/app/hub" />
        <div className="container max-w-4xl py-12">
          <div className="h-12 w-1/2 animate-pulse rounded bg-perestroika-preto/5" />
          <div className="mt-6 h-96 animate-pulse rounded-3xl bg-perestroika-preto/5" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-dvh bg-perestroika-bege">
        <PageHeader showLogo logoLink="/app/hub" />
        <div className="container max-w-md py-20 text-center">
          <p className="mb-4 font-display text-3xl uppercase">não achei essa pessoa</p>
          <p className="mb-6 font-body text-sm text-perestroika-preto/70">
            o link pode estar errado ou a carta ainda não tá publicada.
          </p>
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-bege"
          >
            <ArrowLeft className="h-4 w-4" /> voltar pra galeria
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.nickname || "builder";
  const nickname = profile.nickname || displayName;
  const tokens = profile.archetype ? ARCHETYPE_TOKENS[profile.archetype] : null;
  const gender = detectGender(profile.display_name ?? profile.nickname);
  const view = profile.archetype ? getArchetypeView(profile.archetype, gender) : null;

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app/hub"
        actions={
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3 w-3" /> galeria
          </Link>
        }
      />

      <main>
        {/* HEADER curto: artwork + nome + cidade + arquétipo */}
        <section className="container max-w-5xl py-8 sm:py-12">
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[200px_1fr]">
            <div className="mx-auto sm:mx-0 aspect-[3/4] w-44 overflow-hidden rounded-3xl bg-perestroika-preto/5">
              {profile.image_url ? (
                <img
                  src={profile.image_url}
                  alt={`carta de ${displayName}`}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <p className="mb-1 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
                builder · {profile.cidade ?? "brasil"}
              </p>
              <h1 className="font-display text-5xl sm:text-7xl uppercase leading-[0.9]">
                {nickname}
              </h1>
              {profile.nickname && profile.display_name && profile.nickname !== profile.display_name && (
                <p className="mt-1 font-body text-sm text-perestroika-preto/60">
                  {profile.display_name}
                </p>
              )}
              {view && tokens && (
                <p className={`mt-3 font-body text-sm uppercase tracking-[0.2em] ${tokens.text}`}>
                  {tokens.emoji} {view.label}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* CARTA COMPLETA */}
        {profile.archetype && profile.card && (
          <section>
            <CartaCompleta
              embedded
              data={{
                display_name: profile.display_name,
                nickname: profile.nickname,
                archetype: profile.archetype,
                emoji: profile.card.emoji,
                essence_phrase: profile.card.essence_phrase,
                tagline: profile.card.tagline,
                superpower_text: profile.card.superpower_text,
                shadow_text: profile.card.shadow_text,
                next_move_text: profile.card.next_move_text,
                full_text: profile.card.full_text,
                gender,
              }}
            />
          </section>
        )}

        {/* PROJETOS */}
        <section className="container max-w-4xl py-12 sm:py-16">
          <header className="mb-6">
            <p className="mb-1 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
              projetos da imersão
            </p>
            <h2 className="font-display text-4xl sm:text-5xl uppercase leading-[0.9]">
              o que {nickname} construiu
            </h2>
          </header>

          {profile.submissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-white/40 p-8 text-center">
              <p className="font-body text-sm text-perestroika-preto/60 italic">
                ainda construindo. assim que enviar, aparece aqui.
              </p>
            </div>
          ) : (
            <ul className="space-y-6">
              {profile.submissions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-3xl border border-perestroika-preto/10 bg-white/50 p-5 sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">
                      missão {String(s.mission_ordem).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-2xl uppercase leading-none">{s.mission_titulo}</h3>
                  </div>
                  <p className="whitespace-pre-wrap font-body text-sm text-perestroika-preto/85">
                    {s.descricao}
                  </p>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-flex items-center gap-1 font-body text-sm text-perestroika-azul underline underline-offset-4 hover:text-perestroika-preto break-all"
                  >
                    {s.link}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>

                  <div className="mt-5 border-t border-perestroika-preto/10 pt-4">
                    <ReactionBar submissionId={s.id} />
                  </div>

                  <div className="mt-5 border-t border-perestroika-preto/10 pt-4">
                    <CommentMural submissionId={s.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="container max-w-5xl py-10">
        <p className="text-center font-body text-xs text-perestroika-preto/60">
          eletiva sebrae · escola sebrae · 1º ano EM
        </p>
      </footer>
    </div>
  );
};

export default HubBuilder;
