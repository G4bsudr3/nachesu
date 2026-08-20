import { useState } from "react";
import { Play } from "lucide-react";

interface Props {
  url: string;
  trailColor: string;
}

const getYouTubeId = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.slice(7);
      if (u.pathname.startsWith("/shorts/")) return u.pathname.slice(8);
    }
    return null;
  } catch {
    return null;
  }
};

const isDirectVideo = (raw: string): boolean =>
  /\.(mp4|webm|mov|m4v)(\?|$)/i.test(raw);

export const PillVideoPlayer = ({ url, trailColor }: Props) => {
  const [active, setActive] = useState(false);
  const ytId = getYouTubeId(url);
  const direct = isDirectVideo(url);

  // sem player suportado: cai pro link externo
  if (!ytId && !direct) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/15 px-3 py-1.5 font-body text-xs uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
      >
        <Play className="h-3.5 w-3.5" /> assistir em nova aba
      </a>
    );
  }

  if (direct) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.04]">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video bg-perestroika-preto"
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  // youtube: lite-style placeholder até o aluno clicar (economia de rede)
  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="mt-4 group relative w-full aspect-video overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.04]"
        aria-label="reproduzir vídeo"
      >
        <img
          src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <span className="absolute inset-0 bg-perestroika-preto/30 group-hover:bg-perestroika-preto/20 transition-colors" />
        <span
          className="absolute inset-0 m-auto h-16 w-16 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
          style={{ backgroundColor: trailColor }}
        >
          <Play className="h-6 w-6 text-perestroika-bege ml-1" fill="currentColor" />
        </span>
      </button>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto">
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
        title="vídeo da pílula"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full aspect-video"
      />
    </div>
  );
};
