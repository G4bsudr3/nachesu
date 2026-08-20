import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, Download, Loader2, Lock } from "lucide-react";
import { toPng } from "html-to-image";
import { useCourseBySlug, useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import {
  NachesCertificate,
  NACHES_CERTIFICATE_DIMENSIONS,
} from "@/components/certificate/NachesCertificate";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * a cor do certificado é a mesma assinatura que o estudante viu o curso
 * inteiro: economia circular roda no tema `ecc` (creme + laranja #F25E3D),
 * então o certificado sai em laranja, não em lilás.
 */
const accentFor = (slug: string) =>
  slug === "economia-circular" ? "#F25E3D" : "#f756a6";

/** fundo do papel: creme do tema ecc na economia circular, bege nas demais */
const paperFor = (slug: string) =>
  slug === "economia-circular" ? "#F5EEE1" : "#f2e4d8";


const CertificadoEletiva = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const { data: snapshot, isLoading: snapLoading } = useEletivaProgress(course?.id ?? null);
  const { data: dashData } = useDashboardData();
  const captureRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.42);
  const [nameInput, setNameInput] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  if (!slug) return <Navigate to="/app" replace />;

  const loading = courseLoading || enrollLoading || (!!course?.id && snapLoading && !snapshot);

  const defaultName =
    dashData?.profile?.display_name?.trim() ||
    dashData?.nicknameDisplay ||
    user?.email?.split("@")[0] ||
    "estudante";

  const storageKey = user?.id && slug ? `naches:cert-name:${user.id}:${slug}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (saved && saved.trim()) {
      setNameInput(saved);
      setNameTouched(true);
    }
  }, [storageKey]);

  const trimmedName = nameInput.trim();
  const fullName = trimmedName || defaultName;

  // pré-preenche o input com o nome padrão do perfil pra evitar que o botão
  // apareça desabilitado e crie confusão. usuário pode editar livremente.
  useEffect(() => {
    if (nameInput === "" && !nameTouched && defaultName && defaultName !== "estudante") {
      setNameInput(defaultName);
    }
  }, [defaultName, nameInput, nameTouched]);

  const totalPublished = snapshot?.totalPublished ?? 0;
  const totalCompleted = snapshot?.totalCompleted ?? 0;
  const pct = totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;
  const isComplete = totalPublished > 0 && totalCompleted >= totalPublished;
  const canDownload = isComplete && fullName.trim().length >= 2;

  const accent = useMemo(() => accentFor(slug), [slug]);
  const paper = useMemo(() => paperFor(slug), [slug]);

  useEffect(() => {
    if (!isComplete) return;

    const updateScale = () => {
      const box = previewBoxRef.current;
      if (!box) return;

      const availableWidth = box.clientWidth;
      const availableHeight = Math.max(window.innerHeight * 0.42, 240);
      const scale = Math.min(
        availableWidth / NACHES_CERTIFICATE_DIMENSIONS.width,
        availableHeight / NACHES_CERTIFICATE_DIMENSIONS.height,
        0.5,
      );

      setPreviewScale(Math.max(scale, 0.18));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    const box = previewBoxRef.current;
    if (box) observer.observe(box);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [isComplete]);

  const handleDownload = async () => {
    if (!captureRef.current || !course) return;
    if (!canDownload) {
      toast({
        title: "escreva seu nome completo",
        description: "o nome vai aparecer no certificado.",
        variant: "destructive",
      });
      return;
    }
    if (storageKey) {
      try { window.localStorage.setItem(storageKey, trimmedName); } catch { /* ignore */ }
    }
    setDownloading(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      // 2 rafs pra layout settled
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 3,
        backgroundColor: paper,
        width: NACHES_CERTIFICATE_DIMENSIONS.width,
        height: NACHES_CERTIFICATE_DIMENSIONS.height,
        cacheBust: true,
      });
      // A4 landscape em mm (297 x 210), mesma proporção 1414x1000 ≈ 1.414
      // jsPDF sob demanda (~163KB gzip): só carrega ao baixar o certificado
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // encaixa mantendo proporção, centralizado
      const imgRatio = NACHES_CERTIFICATE_DIMENSIONS.width / NACHES_CERTIFICATE_DIMENSIONS.height;
      const pageRatio = pageW / pageH;
      let w = pageW;
      let h = pageH;
      if (imgRatio > pageRatio) {
        h = pageW / imgRatio;
      } else {
        w = pageH * imgRatio;
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST");
      pdf.save(`certificado-${slugify(course.title)}-${slugify(fullName)}.pdf`);
      toast({ title: "certificado baixado", description: "boa, chegou até o fim." });
    } catch (err) {
      logger.error("[CertificadoEletiva] falha ao gerar pdf", err);
      toast({
        title: "não consegui gerar agora",
        description: "tenta de novo em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="thinking" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55">preparando seu certificado...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />
        <main className="container max-w-2xl pt-10 pb-20 text-center">
          <h1 className="font-display uppercase text-4xl mb-3">eletiva não encontrada</h1>
          <Link to="/app" className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide">voltar</Link>
        </main>
      </div>
    );
  }

  const isEnrolled = !!enrollments?.some((e) => e.course_id === course.id);
  if (!isEnrolled) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />
        <main className="container max-w-2xl pt-10 pb-20 text-center space-y-4">
          <EletivaSymbol size={80} pose="resting" />
          <h1 className="font-display uppercase text-3xl">acesso restrito</h1>
          <p className="font-body text-sm text-perestroika-preto/75">
            você não está matriculado em <strong>{course.title.toLowerCase()}</strong>.
          </p>
          <Link to="/app" className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body text-sm">voltar</Link>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-dvh bg-background text-foreground font-body [overflow-x:clip]"
      data-eletiva={slug === "economia-circular" ? "ecc" : undefined}
    >
      <PageHeader
        showLogo
        logoLink="/app"
        back={{ to: `/app/eletiva/${slug}`, label: "voltar pra eletiva" }}
        actions={<AuthedHeaderActions />}
      />

      <main className="container max-w-5xl pt-6 pb-[calc(4rem+var(--mobile-nav-h,0px))] sm:pt-10 sm:pb-16">
        <header className="mb-8 max-w-2xl">
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-perestroika-preto/60 mb-2">
            seu certificado
          </p>
          <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.88] mb-3">
            {isComplete ? "BOA! VOCÊ CHEGOU LÁ." : "quase lá."}
          </h1>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75">
            {isComplete
              ? `você concluiu 100% da eletiva ${course.title.toLowerCase()}. baixe seu certificado oficial em alta resolução.`
              : `o certificado libera quando você concluir 100% dos módulos. você está em ${totalCompleted} de ${totalPublished} (${pct}%).`}
          </p>
        </header>

        {/* barra de progresso pra quem ainda não fechou */}
        {!isComplete && (
          <section className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-perestroika-preto text-perestroika-bege">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-display uppercase text-2xl leading-tight mb-1">
                  faltam {Math.max(totalPublished - totalCompleted, 0)} {totalPublished - totalCompleted === 1 ? "módulo" : "módulos"}
                </p>
                <p className="font-body text-sm text-perestroika-preto/70 mb-4">
                  conclua os módulos restantes para liberar o certificado oficial.
                </p>
                <div className="h-2 rounded-full bg-perestroika-preto/15 overflow-hidden mb-4">
                  <div
                    className="h-full transition-[width] duration-700"
                    style={{ width: `${pct}%`, backgroundColor: accent }}
                  />
                </div>
                <Link
                  to={`/app/eletiva/${slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
                >
                  <ArrowLeft className="h-4 w-4" /> voltar pros módulos
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* prévia + ação (só quando 100%) */}
        {isComplete && (
          <>
            <div className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8 mb-6 mx-auto w-full max-w-3xl">
              <label htmlFor="cert-name" className="block font-display uppercase text-2xl leading-tight mb-1">
                seu nome completo
              </label>
              <p className="font-body text-sm text-perestroika-preto/70 mb-4">
                é assim que vai aparecer impresso no certificado. capriche na grafia.
              </p>
              <input
                id="cert-name"
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameTouched(true); }}
                placeholder={defaultName}
                maxLength={80}
                autoComplete="name"
                className="w-full rounded-2xl border-2 border-perestroika-preto/20 bg-white px-4 py-3 font-body text-base text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none focus:border-perestroika-preto transition-colors"
              />
              {nameTouched && trimmedName.length > 0 && trimmedName.length < 2 && (
                <p className="mt-2 font-body text-xs text-perestroika-vermelho">nome muito curto.</p>
              )}
            </div>


            <div
              className="rounded-3xl border-2 border-perestroika-preto/15 bg-white/50 p-4 sm:p-6 mb-6 mx-auto w-full max-w-3xl"
            >
              <div
                ref={previewBoxRef}
                className="w-full overflow-hidden"
                style={{
                  width: "100%",
                  height: NACHES_CERTIFICATE_DIMENSIONS.height * previewScale,
                  position: "relative",
                  marginInline: "auto",
                }}
              >
                <div
                  className="shadow-xl rounded-lg overflow-hidden"
                  style={{
                    width: NACHES_CERTIFICATE_DIMENSIONS.width,
                    height: NACHES_CERTIFICATE_DIMENSIONS.height,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    marginLeft: -(NACHES_CERTIFICATE_DIMENSIONS.width * previewScale) / 2,
                  }}
                >
                  <NachesCertificate
                    fullName={fullName}
                    courseTitle={course.title}
                    courseSubtitle={course.subtitle}
                    professorName={course.professor_name}
                    accentColor={accent}
                    paperColor={paper}
                  />
                </div>
              </div>
              <p className="mt-3 text-center font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/50">
                prévia · o arquivo final é em alta resolução
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6">
              <div className="flex items-start gap-3">
                <Award className="h-6 w-6 text-perestroika-preto shrink-0 mt-0.5" style={{ color: accent }} />
                <div>
                  <p className="font-display uppercase text-2xl leading-tight">certificado pronto</p>
                  <p className="font-body text-sm text-perestroika-preto/70">
                    arquivo pdf em alta resolução (a4 paisagem), fiel à prévia acima.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !canDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body font-semibold text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> baixar certificado
                  </>
                )}
              </button>
            </div>

            {/* nó off-screen usado pra captura em tamanho real */}
            <div
              aria-hidden
              style={{
                position: "fixed",
                top: -20000,
                left: -20000,
                width: NACHES_CERTIFICATE_DIMENSIONS.width,
                height: NACHES_CERTIFICATE_DIMENSIONS.height,
                pointerEvents: "none",
              }}
            >
              <NachesCertificate
                ref={captureRef}
                fullName={fullName}
                courseTitle={course.title}
                courseSubtitle={course.subtitle}
                professorName={course.professor_name}
                accentColor={accent}
                paperColor={paper}
              />
            </div>
          </>
        )}
      </main>

      <EletivaFooter />
      <MobileNav />
    </div>
  );
};

export default CertificadoEletiva;
