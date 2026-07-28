interface Props {
  nickname: string;
  totalCompleted: number;
  totalPublished: number;
  /** dias desde a última atividade do aluno (null = nunca começou) */
  daysSinceLastActivity: number | null;
  /**
   * snapshot da eletiva ainda carregando. quando true, a linha de contexto
   * vira um placeholder sutil pra não piscar de "a eletiva está aquecendo"
   * pra "boa, você tá construindo. 3/5 fechados." no segundo seguinte.
   */
  loading?: boolean;
  /** quantidade de eletivas ativas do aluno — define o convite de escolha. */
  enrollmentCount?: number;
}

const buildContextLine = (
  totalCompleted: number,
  totalPublished: number,
  daysSinceLastActivity: number | null,
): string => {
  // ainda não tem nada publicado pra fazer
  if (totalPublished === 0) {
    return "a eletiva está aquecendo. enquanto isso, dá uma olhada no mapa.";
  }
  // tudo concluído
  if (totalCompleted > 0 && totalCompleted === totalPublished) {
    return "você fechou tudo o que tá aberto. respeita.";
  }
  // primeiro acesso (nunca começou nada, mas tem módulo aberto)
  if (totalCompleted === 0) {
    return "bom te ver por aqui. seu próximo passo tá logo abaixo.";
  }
  // pausa longa
  if (daysSinceLastActivity !== null && daysSinceLastActivity >= 7) {
    return `faz ${daysSinceLastActivity} dias. retoma quando der.`;
  }
  // em curso
  return "boa, você tá construindo. continua de onde parou.";
};

export const DashboardGreeting = ({
  nickname,
  totalCompleted,
  totalPublished,
  daysSinceLastActivity,
  loading = false,
  enrollmentCount = 0,
}: Props) => {
  const contextLine =
    enrollmentCount > 1
      ? `você tem ${enrollmentCount === 2 ? "duas" : enrollmentCount} eletivas liberadas. qual vamos estudar hoje?`
      : enrollmentCount === 1
        ? "você tem uma eletiva liberada. bora estudar hoje?"
        : buildContextLine(totalCompleted, totalPublished, daysSinceLastActivity);


  return (
    <section aria-label="saudação" className="space-y-1.5">
      <h1 className="font-display uppercase text-4xl sm:text-5xl leading-none text-perestroika-preto">
        oi, {nickname || "builder"}.
      </h1>
      {loading ? (
        <div
          aria-hidden="true"
          className="h-4 sm:h-5 w-64 max-w-full rounded bg-perestroika-preto/10 motion-safe:animate-pulse"
        />
      ) : (
        <p className="font-body text-sm sm:text-base text-perestroika-preto/70 max-w-prose">
          {contextLine}
        </p>
      )}
    </section>
  );
};
