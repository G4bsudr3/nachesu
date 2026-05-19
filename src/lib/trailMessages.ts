export type TrailMessage = {
  eyebrow: string;
  head: string;
  sub: string;
};

/**
 * mensagens narrativas do arco 4 trilhas × 5 módulos.
 * usado pelo banner de transição no topo do primeiro módulo da próxima trilha
 * e pela tela cheia de marco entre trilhas.
 *
 * a chave é o order_index da trilha que ESTÁ COMEÇANDO (2, 3, 4).
 */
export const trailMessages: Record<number, TrailMessage> = {
  2: {
    eyebrow: "fim da trilha 1 · começo da trilha 2",
    head: "você passou de enxergar pra entender",
    sub: "as próximas 5 semanas mergulham fundo no que você viu. sai do panorama, entra no detalhe.",
  },
  3: {
    eyebrow: "fim da trilha 2 · começo da trilha 3",
    head: "agora é hora de criar",
    sub: "você já entende o problema. as próximas 5 semanas são pra ideação e prototipação. mão na massa.",
  },
  4: {
    eyebrow: "fim da trilha 3 · começo da trilha 4",
    head: "última volta · hora de validar",
    sub: "o que você criou precisa encontrar o mundo. as próximas 5 semanas são teste, evidência e entrega final.",
  },
};

/** mensagem da tela final (eletiva concluída por completo). */
export const finishMessage: TrailMessage = {
  eyebrow: "fim da eletiva",
  head: "você foi até o fim",
  sub: "20 módulos, 4 trilhas, um caminho inteiro. respira fundo. o que você construiu aqui é seu.",
};
