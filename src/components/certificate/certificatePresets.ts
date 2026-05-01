// presets visuais pro certificado.
// 3 opções honestas, todas renderizadas via DOM (CertificateEditorial).
// quando o aluno tem carta de builder + artwork prontas, ela entra grande
// automaticamente em qualquer um dos 3 presets ("archetypeShowcase" implícito).

export type CertificatePreset =
  | "bege-editorial"
  | "preto-cinema"
  | "gradient-festa";

export interface PresetMeta {
  id: CertificatePreset;
  label: string;
  description: string;
  // tokens visuais usados no swatch do formulário
  background: string;
  textColor: string;
  accent: string;
}

export const CERTIFICATE_PRESETS: Record<CertificatePreset, PresetMeta> = {
  "bege-editorial": {
    id: "bege-editorial",
    label: "bege editorial",
    description: "o clássico Perestroika. fundo bege, tipografia preta, lágrima no canto.",
    background: "#f2e4d8",
    textColor: "#090909",
    accent: "linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
  },
  "preto-cinema": {
    id: "preto-cinema",
    label: "preto cinema",
    description: "fundo preto profundo, tipografia bege, mood de pôster.",
    background: "#090909",
    textColor: "#f2e4d8",
    accent: "linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
  },
  "gradient-festa": {
    id: "gradient-festa",
    label: "gradient festa",
    description: "fundo gradient vermelho, rosa, bege. energia de festival.",
    background: "linear-gradient(180deg, #fd4644 0%, #f756a6 40%, #f2e4d8 100%)",
    textColor: "#090909",
    accent: "#090909",
  },
};

export const PRESET_LIST = Object.values(CERTIFICATE_PRESETS);

export const DEFAULT_PRESET: CertificatePreset = "bege-editorial";
