// estilos compartilhados pros emails da nachesu
// paleta perestroika: bege #f2e4d8, laranja #fe7b02, vermelho #fd4644,
// rosa #f756a6, azul #6f77fc, preto #090909
// nome do arquivo mantido por compat com imports existentes.

// escala tipográfica e de espaçamento — inspirada no design system:
// display grande em League Gothic, body em Urbanist 16/1.6, ritmo 8/16/24/32.

const DISPLAY_STACK = "'League Gothic', Impact, sans-serif"
const BODY_STACK = "'Urbanist', system-ui, sans-serif"
const INK = '#090909'
const BEGE = '#f2e4d8'
const CANVAS = '#ede0d3'

export const main = {
  backgroundColor: CANVAS,
  fontFamily: BODY_STACK,
  margin: 0,
  padding: '32px 16px',
  WebkitFontSmoothing: 'antialiased' as const,
}

export const container = {
  backgroundColor: BEGE,
  borderRadius: '28px',
  padding: '48px 40px 40px',
  maxWidth: '560px',
  margin: '0 auto',
}

// wordmark: logo oficial NachesU hospedado no bucket email-assets
export const WORDMARK_URL =
  'https://jrzahsjrzaaktuelnsaw.supabase.co/storage/v1/object/public/email-assets/nachesu-wordmark.png'

export const wordmarkImg = {
  width: '132',
  height: '37',
  display: 'block',
  margin: '0 0 40px',
  border: '0',
} as const

// mantido pra compat com imports antigos (não usado nos templates novos)
export const wordmark = {
  fontFamily: DISPLAY_STACK,
  fontSize: '32px',
  fontWeight: 400 as const,
  color: INK,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 40px',
  lineHeight: '1',
}

export const h1 = {
  fontFamily: DISPLAY_STACK,
  fontSize: '48px',
  lineHeight: '1',
  fontWeight: 400 as const,
  color: INK,
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
  letterSpacing: 'normal' as const,
}

// classe usada no <Heading> dos templates pra ativar o tamanho desktop via media query
export const h1ClassName = 'nachesu-email-h1'

// classe usada no corpo de texto dos emails (Urbanist 400 / 16px)
export const bodyClassName = 'font-body'

// escala responsiva: text-5xl no mobile (48px), sm:text-6xl no desktop (60px)
export const responsiveH1Style = `
  @media (min-width: 640px) {
    .${h1ClassName} {
      font-size: 60px !important;
    }
  }
`

export const text = {
  fontFamily: BODY_STACK,
  fontSize: '16px',
  color: INK,
  lineHeight: '1.6',
  margin: '0 0 16px',
  fontWeight: 400 as const,
}

export const link = {
  color: INK,
  textDecoration: 'underline',
  fontWeight: 600 as const,
}

// botão com gradiente perestroika; fallback sólido laranja pra clientes legados
export const button = {
  backgroundColor: '#fe7b02',
  backgroundImage:
    'linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)',
  color: '#ffffff',
  fontFamily: BODY_STACK,
  fontSize: '14px',
  fontWeight: 700 as const,
  textTransform: 'lowercase' as const,
  letterSpacing: '0.5px',
  borderRadius: '999px',
  padding: '16px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 32px',
}

export const codeStyle = {
  fontFamily: DISPLAY_STACK,
  fontSize: '56px',
  lineHeight: '1',
  fontWeight: 400 as const,
  color: '#fd4644',
  letterSpacing: '10px',
  margin: '16px 0 32px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '24px 16px',
}

// barra de gradiente decorativa (substitui a lagrima)
export const accentBar = {
  height: '3px',
  width: '56px',
  backgroundImage:
    'linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)',
  borderRadius: '4px',
  margin: '32px 0 20px',
  border: 'none',
}

export const footer = {
  fontFamily: BODY_STACK,
  fontSize: '12px',
  color: INK,
  opacity: 0.65,
  margin: '0',
  lineHeight: '1.6',
  letterSpacing: '0.2px',
}

// @font-face explícito (Gmail ignora @import; alguns clientes suportam @font-face).
// urls apontam direto pros woff2 hospedados pelo google fonts (estáveis).
export const fontImport = `
@font-face {
  font-family: 'Urbanist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyMqrbOwreOw.woff2') format('woff2');
}
@font-face {
  font-family: 'Urbanist';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyOKobOwreOw.woff2') format('woff2');
}
@font-face {
  font-family: 'Urbanist';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyN6nbOwreOw.woff2') format('woff2');
}
@font-face {
  font-family: 'League Gothic';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://fonts.gstatic.com/s/leaguegothic/v11/qFdR35CBi4tvBz81xy7WG7ep-BQAY7Krj7feObpH_-amidQ.woff2') format('woff2');
}
.${bodyClassName} { font-family: ${BODY_STACK} !important; font-size: 16px; font-weight: 400; line-height: 1.6; color: ${INK}; }`

// footer padrão reutilizável como string
export const FOOTER_LINE_1 = 'vai lá e cria.'
export const FOOTER_LINE_2 = 'nachesu · uma plataforma naches · em parceria com escola sebrae'
