/**
 * gera href pro módulo respeitando o slug da eletiva quando disponível.
 * com slug → rota canônica /app/eletiva/:slug/modulo/:n
 * sem slug → rota legada /app/modulo/:n (continua funcional via redirect)
 */
export const moduloHref = (slug: string | null | undefined, number: number): string => {
  if (slug) return `/app/eletiva/${slug}/modulo/${number}`;
  return `/app/modulo/${number}`;
};
