// feature flags da pesquisa final.
// quando estiver pronto pra liberar pro aluno, troca FINAL_FEEDBACK_ENABLED pra true.

export const FINAL_FEEDBACK_ENABLED = true;

// só temos um modelo de certificado agora: editorial.
// mantemos o tipo pra preservar shape de tabelas/edge functions sem breaking change.
export type CertificateVariant = "editorial";

export const CERTIFICATE_VARIANT: CertificateVariant = "editorial";

// info do evento, hardcoded pra usar nos certificados e na pesquisa.
export const EVENT_INFO = {
  nome: "Chŏra Lovable",
  carga_horaria: "14h",
  local: "Instituto Caldeira",
  cidade: "Porto Alegre",
  data_curta: "25 e 26 de abril de 2026",
  data_compacta: "25-26 ABR 2026",
  cnpj: "23.312.567/0001-07",
  produtora: "",
};
