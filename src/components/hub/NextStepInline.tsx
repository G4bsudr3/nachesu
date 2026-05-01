import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  label: string;
  helper?: string;
  href: string;
  tone?: "default" | "success";
}

/** pílula slim de "próximo passo" pra usar em rodapés de página. */
export const NextStepInline = ({ label, helper, href, tone = "default" }: Props) => {
  const isSuccess = tone === "success";
  return (
    <Link
      to={href}
      className={`group mt-10 mb-2 flex items-center gap-4 rounded-2xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
        isSuccess
          ? "border-perestroika-azul/40 bg-perestroika-azul/10"
          : "border-perestroika-preto/15 bg-perestroika-preto/[0.03] hover:border-perestroika-preto/30"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-[10px] sm:text-xs uppercase tracking-wide text-perestroika-preto/55">
          próximo passo
        </p>
        <p className="mt-0.5 font-display uppercase text-xl sm:text-2xl leading-tight text-balance text-perestroika-preto">
          {label}
        </p>
        {helper && (
          <p className="mt-0.5 font-body text-xs sm:text-sm text-perestroika-preto/65 text-pretty">
            {helper}
          </p>
        )}
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-perestroika-preto group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
};
