import { useState } from "react";
import { Play } from "lucide-react";

interface Props {
  url: string;
  title: string;
  accent: string;
  poster?: string | null;
}

/**
 * fachada de clique pra vídeos em iframe (loom, youtube, vimeo).
 * o player pesado só é montado depois do clique, então a página abre rápido
 * em vez de disputar rede com centenas de requests do player.
 */
export function VideoFacade({ url, title, accent, poster }: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = loaded && !url.includes("autoplay") ? withAutoplay(url) : url;

  if (loaded) {
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-perestroika-preto"
      aria-label={`tocar vídeo: ${title}`}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      )}
      <span
        className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform group-hover:scale-110 group-active:scale-95"
        style={{ backgroundColor: accent }}
      >
        <Play className="h-8 w-8 fill-perestroika-bege text-perestroika-bege" aria-hidden="true" />
      </span>
      <span className="absolute bottom-3 left-4 font-body text-[11px] uppercase tracking-wider text-perestroika-bege/75">
        tocar vídeo
      </span>
    </button>
  );
}

function withAutoplay(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("autoplay", "1");
    return u.toString();
  } catch {
    return url;
  }
}
