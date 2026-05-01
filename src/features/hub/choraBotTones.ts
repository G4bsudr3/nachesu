// tons disponíveis pro chŏra bot. mantém em sync com a edge function chora-bot-chat.
export type ChoraBotTone = "padrao" | "tecnico" | "acolhedor" | "criativo";

export const CHORA_BOT_TONES: {
  id: ChoraBotTone;
  label: string;
  hint: string;
}[] = [
  {
    id: "padrao",
    label: "padrão",
    hint: "tom da casa, direto e com personalidade",
  },
  {
    id: "tecnico",
    label: "técnico",
    hint: "preciso, com snippets e jargão liberado",
  },
  {
    id: "acolhedor",
    label: "acolhedor",
    hint: "empático, encorajador, sem rebuscar",
  },
  {
    id: "criativo",
    label: "criativo",
    hint: "analogias, exemplos, ideias soltas",
  },
];

export const TONE_STORAGE_KEY = "chora.bot.tone";

export const isChoraBotTone = (v: unknown): v is ChoraBotTone =>
  typeof v === "string" && CHORA_BOT_TONES.some((t) => t.id === v);
