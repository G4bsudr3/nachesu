import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

/**
 * mostrado quando tutor_settings.enabled = false (kill switch).
 * substitui completamente a UI de chat por: aviso + canal direto pro educador.
 */
export const TutorDisabledNotice = () => (
  <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 px-5 py-6">
    <div className="flex flex-col items-center text-center gap-3">
      <EletivaSymbol pose="resting" className="size-20" />
      <p className="font-display uppercase text-2xl leading-none">tutor em ajuste</p>
      <p className="font-body text-sm text-perestroika-preto/70 max-w-sm">
        o joão-de-barro tá descansando enquanto a gente afia o que ele entende. enquanto isso, manda dúvida direto pro educador, tá igual rápido.
      </p>
    </div>

    <div className="mt-5 pt-5 border-t border-perestroika-preto/15 space-y-3">
      <p className="font-display uppercase text-xs tracking-wider text-perestroika-preto/55">
        canais ativos
      </p>
      <ul className="space-y-2 text-sm text-perestroika-preto/80">
        <li className="flex gap-2">
          <span className="font-bold">·</span>
          <span>módulo presencial com Dudu (economia circular) ou frattz (ia na prática)</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">·</span>
          <span>whats da sua turma — pergunta nominal pro educador</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">·</span>
          <span>em caso de risco à vida: <strong>CVV 188</strong> (24h, gratuito)</span>
        </li>
      </ul>
    </div>
  </div>
);
