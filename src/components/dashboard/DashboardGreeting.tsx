interface Props {
  nickname: string;
  totalCompleted: number;
  totalPublished: number;
  /** dias desde a última atividade do aluno (null = nunca começou) */
  daysSinceLastActivity: number | null;
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
    return "bom te ver por aqui. abaixo, o seu próximo passo.";
  }
  // pausa longa
  if (daysSinceLastActivity !== null && daysSinceLastActivity >= 7) {
    return `faz ${daysSinceLastActivity} dias. retoma quando der.`;
  }
  // em curso
  return `boa, você tá construindo. ${totalCompleted}/${totalPublished} fechados.`;
};

export const DashboardGreeting = ({
  nickname,
  totalCompleted,
  totalPublished,
  daysSinceLastActivity,
}: Props) => {
  const contextLine = buildContextLine(
    totalCompleted,
    totalPublished,
    daysSinceLastActivity,
  );

  return (
    <section aria-label="saudação" className="space-y-1.5">
      <h1 className="font-display uppercase text-3xl sm:text-4xl leading-none text-perestroika-preto">
        oi, {nickname || "builder"}.
      </h1>
      <p className="font-body text-sm sm:text-base text-perestroika-preto/70 max-w-prose">
        {contextLine}
      </p>
    </section>
  );
};
