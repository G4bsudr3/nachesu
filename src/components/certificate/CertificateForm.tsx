import { useMemo, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { CertificateRenderer, CERTIFICATE_DIMENSIONS } from "./CertificateRenderer";
import { CERTIFICATE_PRESETS, PRESET_LIST, DEFAULT_PRESET, type CertificatePreset } from "./certificatePresets";
import type { Archetype } from "@/components/carta/cartaTokens";
import { detectGender } from "@/lib/gender";

interface ArchetypeInfo {
  archetype: string;
  emoji: string;
}

interface Props {
  defaultDisplayName: string;
  defaultNickname?: string | null;
  archetypeInfo: ArchetypeInfo | null;
  /** arquétipo enum cru (pra renderizar a carta na prévia) */
  archetype?: Archetype | null;
  /** url da artwork oficial pra mostrar na prévia */
  tarotImageUrl?: string | null;
  onGenerate: (data: {
    fullName: string;
    preset: CertificatePreset;
  }) => void;
  generating?: boolean;
}

export const CertificateForm = ({
  defaultDisplayName,
  defaultNickname,
  archetypeInfo,
  archetype,
  tarotImageUrl,
  onGenerate,
  generating = false,
}: Props) => {
  const [name, setName] = useState(defaultDisplayName.trim() || "builder");
  const [preset, setPreset] = useState<CertificatePreset>(DEFAULT_PRESET);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 60;

  const firstName = useMemo(
    () => defaultDisplayName.trim().split(/\s+/)[0] || "builder",
    [defaultDisplayName],
  );

  const chips = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: "nome completo", value: defaultDisplayName.trim() || firstName },
      { label: "só o primeiro nome", value: firstName },
    ];
    if (defaultNickname && defaultNickname.trim()) {
      items.push({ label: `nickname (@${defaultNickname.trim()})`, value: defaultNickname.trim() });
    }
    return items;
  }, [defaultDisplayName, defaultNickname, firstName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid || generating) return;
    onGenerate({ fullName: trimmedName, preset });
  };

  // prévia ao vivo: mesmo componente que vai sair no PNG, em escala reduzida
  const dims = CERTIFICATE_DIMENSIONS.editorial;
  const previewWidth = 720;
  const previewScale = previewWidth / dims.width;
  const previewName = trimmedName || "seu nome";
  const previewGender = detectGender(previewName);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-perestroika-laranja mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          monte o seu
        </div>
        <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.9] mb-3">
          como você quer aparecer?
        </h1>
        <p className="font-body text-perestroika-preto/70 max-w-md mx-auto text-balance">
          duas escolhas e o seu certificado fica pronto. tipografia editorial, qualidade de impressão, fiel à prévia.
          {archetypeInfo && " a carta do seu arquétipo entra automaticamente."}
        </p>
      </header>

      {/* 1. NOME */}
      <section className="flex flex-col gap-3">
        <label className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
          1. nome no certificado
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          aria-invalid={!nameValid}
          className="w-full px-5 py-4 bg-perestroika-bege border-2 border-perestroika-preto/15 rounded-xl font-body text-base focus:border-perestroika-preto focus:outline-none transition-colors"
          placeholder="seu nome do jeito que você quer ver"
        />
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setName(c.value)}
              className="px-3 py-1.5 text-xs uppercase tracking-wide border border-perestroika-preto/15 rounded-full hover:border-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>
        {!nameValid && (
          <p className="text-xs text-perestroika-vermelho">precisa ter entre 2 e 60 caracteres.</p>
        )}
      </section>

      {/* 2. ESTILO VISUAL */}
      <section className="flex flex-col gap-3">
        <label className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
          2. estilo visual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_LIST.map((p) => {
            const selected = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`relative p-4 rounded-xl text-left transition-all border-2 ${
                  selected
                    ? "border-perestroika-preto"
                    : "border-perestroika-preto/15 hover:border-perestroika-preto/30"
                }`}
              >
                <div
                  className="w-full h-24 rounded-xl mb-3 relative overflow-hidden"
                  style={{ background: p.background }}
                >
                  <div
                    className="absolute top-2 left-2 w-6 h-8 rounded-sm"
                    style={{ background: p.accent }}
                  />
                  <div
                    className="absolute bottom-3 left-3 right-3 h-3 rounded"
                    style={{ background: p.textColor, opacity: 0.85 }}
                  />
                  <div
                    className="absolute bottom-7 left-3 w-1/2 h-1.5 rounded"
                    style={{ background: p.textColor, opacity: 0.4 }}
                  />
                </div>
                <div className="font-display uppercase text-base mb-1">{p.label}</div>
                <div className="text-xs text-perestroika-preto/60 leading-snug">{p.description}</div>
                {selected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-perestroika-preto rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-perestroika-bege" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* PRÉVIA AO VIVO — o certificado de verdade, em escala reduzida */}
      <section className="flex flex-col gap-3">
        <label className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
          prévia ao vivo
        </label>
        <p className="text-xs text-perestroika-preto/55 -mt-1">
          é exatamente isso que vai sair em alta resolução.
        </p>
        <div className="flex justify-center">
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-perestroika-preto/15"
            style={{
              width: dims.width * previewScale,
              height: dims.height * previewScale,
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                width: dims.width,
                height: dims.height,
              }}
            >
              <CertificateRenderer
                fullName={previewName}
                archetype={archetype ?? null}
                gender={previewGender}
                tarotImageUrl={tarotImageUrl ?? null}
                preset={preset}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!nameValid || generating}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-10 py-5 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          <Sparkles className="w-4 h-4" />
          gerar meu certificado
        </button>
        <p className="text-xs text-perestroika-preto/50">
          renderiza em alta resolução pra baixar e compartilhar.
        </p>
      </div>
    </form>
  );
};
