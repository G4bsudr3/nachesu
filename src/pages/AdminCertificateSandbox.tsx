import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { CertificateRenderer, CERTIFICATE_DIMENSIONS } from "@/components/certificate/CertificateRenderer";
import { useCertificateDownload } from "@/components/certificate/useCertificateDownload";
import { ARCHETYPE_TOKENS, type Archetype } from "@/components/carta/cartaTokens";
import { detectGender } from "@/lib/gender";
import { FlaskConical, Sparkles, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface CritiqueIssue {
  priority: "high" | "medium" | "low";
  area: string;
  problem: string;
  fix: string;
}
interface Critique {
  overall_score: number;
  scores: Record<string, number>;
  what_works: string[];
  issues: CritiqueIssue[];
  verdict: string;
}

const ARCHETYPE_OPTIONS: Archetype[] = ["visionario", "artesao", "experimentador", "conector", "pragmatico", "narrador"];

const AdminCertificateSandbox = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; nickname: string | null } | null>(null);
  const [archetype, setArchetype] = useState<Archetype>("visionario");
  const [customName, setCustomName] = useState("");
  const [tarotImageUrl, setTarotImageUrl] = useState<string | null>(null);
  const [critiquing, setCritiquing] = useState(false);
  const [critique, setCritique] = useState<Critique | null>(null);
  const { generate, downloading } = useCertificateDownload();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, nickname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("archetype_artworks")
      .select("image_url")
      .eq("archetype", archetype)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTarotImageUrl(data?.image_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [archetype]);

  const fullName =
    customName.trim() ||
    profile?.display_name ||
    profile?.nickname ||
    "Mateus Frattezi";
  const gender = detectGender(fullName);

  const dims = CERTIFICATE_DIMENSIONS.editorial;
  const targetWidth = 900;
  const scale = targetWidth / dims.width;

  const handleCritique = async () => {
    setCritiquing(true);
    setCritique(null);
    try {
      const result = await generate({
        fullName,
        archetype,
        gender,
        userId: null,
        tarotImageUrl,
      });
      if (!result) {
        toast.error("falha ao renderizar o certificado");
        return;
      }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(result.blob);
      });
      const { data, error } = await supabase.functions.invoke("critique-certificate", {
        body: { imageDataUrl: dataUrl },
      });
      if (error) {
        toast.error(error.message ?? "erro ao chamar a IA");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setCritique(data.critique);
      toast.success(`crítica pronta · nota geral ${data.critique.overall_score}/10`);
    } catch (err) {
      logger.error(err);
      toast.error("algo quebrou na crítica");
    } finally {
      setCritiquing(false);
    }
  };

  const handleDownload = async () => {
    const result = await generate({
      fullName,
      archetype,
      gender,
      userId: null,
      tarotImageUrl,
    });
    if (!result) {
      toast.error("falha ao gerar PNG");
      return;
    }
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `certificado-${archetype}-${fullName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(result.url);
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto">
      <PageHeader back={{ to: "/admin", label: "voltar pro admin" }} />
      <main className="container max-w-6xl pb-20">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-perestroika-laranja mb-2">
            <FlaskConical className="w-3.5 h-3.5" />
            sandbox
          </div>
          <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.9]">
            sandbox do certificado
          </h1>
          <p className="mt-3 font-body text-perestroika-preto/70 max-w-2xl">
            ambiente pra testar o certificado oficial com nome e arquétipo customizados.
            roda crítica visual com IA pra ajustar layout antes de imprimir. nada aqui é salvo no banco.
          </p>
        </div>

        {/* controles */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8 p-5 rounded-2xl bg-white/40 border border-perestroika-preto/10">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
              nome no certificado
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={fullName}
              className="w-full bg-perestroika-bege border border-perestroika-preto/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-perestroika-preto/40"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
              arquétipo (carta de tarot embutida)
            </label>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as Archetype)}
              className="w-full bg-perestroika-bege border border-perestroika-preto/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-perestroika-preto/40"
            >
              {ARCHETYPE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {ARCHETYPE_TOKENS[a].emoji} {ARCHETYPE_TOKENS[a].labels.m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-display uppercase text-3xl">certificado oficial</h3>
              <p className="text-sm text-perestroika-preto/65">
                landscape A4 · nome completo + carta de tarot do arquétipo
                {!tarotImageUrl && " · ⚠️ artwork desse arquétipo não está pronta no baralho, a coluna da carta vai sumir"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCritique}
                disabled={critiquing || downloading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-perestroika-laranja via-perestroika-vermelho to-perestroika-rosa text-white px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                title="análise visual via IA (gemini 2.5 pro)"
              >
                {critiquing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {critiquing ? "criticando..." : "criticar com IA"}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading || critiquing}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege border border-perestroika-preto/20 text-perestroika-preto px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-white transition-colors disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                baixar PNG 3x
              </button>
            </div>
          </div>

          {critique && (
            <div className="mb-6 p-6 rounded-2xl bg-white/70 border border-perestroika-preto/15">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-display text-5xl">{critique.overall_score.toFixed(1)}</span>
                <span className="text-xs uppercase tracking-[0.3em] text-perestroika-preto/55">/ 10 nota geral</span>
              </div>
              <p className="text-sm italic text-perestroika-preto/80 mb-5">"{critique.verdict}"</p>

              <div className="grid sm:grid-cols-3 gap-2 mb-5 text-xs">
                {Object.entries(critique.scores).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between bg-perestroika-bege/60 rounded-lg px-3 py-2">
                    <span className="text-perestroika-preto/70">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{v}/10</span>
                  </div>
                ))}
              </div>

              {critique.what_works.length > 0 && (
                <div className="mb-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
                    funciona bem
                  </div>
                  <ul className="space-y-1 text-sm">
                    {critique.what_works.map((w, i) => (
                      <li key={i} className="flex gap-2"><span className="text-perestroika-laranja">✓</span>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {critique.issues.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
                    problemas ({critique.issues.length})
                  </div>
                  <ul className="space-y-3">
                    {critique.issues.map((iss, i) => (
                      <li key={i} className="border-l-2 pl-3" style={{ borderColor: iss.priority === "high" ? "#fd4644" : iss.priority === "medium" ? "#fe7b02" : "#6f77fc" }}>
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1">
                          <span className="font-bold" style={{ color: iss.priority === "high" ? "#fd4644" : iss.priority === "medium" ? "#fe7b02" : "#6f77fc" }}>{iss.priority}</span>
                          <span className="text-perestroika-preto/55">·</span>
                          <span className="text-perestroika-preto/70">{iss.area}</span>
                        </div>
                        <p className="text-sm text-perestroika-preto/85">{iss.problem}</p>
                        <p className="text-sm text-perestroika-preto/65 mt-1"><span className="font-semibold">fix:</span> {iss.fix}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-center">
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-perestroika-preto/10"
              style={{
                width: dims.width * scale,
                height: dims.height * scale,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: dims.width,
                  height: dims.height,
                }}
              >
                <CertificateRenderer
                  fullName={fullName}
                  archetype={archetype}
                  gender={gender}
                  tarotImageUrl={tarotImageUrl}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminCertificateSandbox;
