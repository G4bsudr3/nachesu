// estilos compartilhados pros emails da nachesu
// paleta perestroika: bege #f2e4d8, laranja #fe7b02, vermelho #fd4644,
// rosa #f756a6, azul #6f77fc, preto #090909
// nome do arquivo mantido por compat com imports existentes.

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Urbanist', Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}

export const container = {
  backgroundColor: '#f2e4d8',
  borderRadius: '24px',
  padding: '40px 32px 32px',
  maxWidth: '560px',
  margin: '0 auto',
}

// wordmark tipográfico (substitui o logo png)
export const wordmark = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '32px',
  fontWeight: 400 as const,
  color: '#090909',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 32px',
  lineHeight: '1',
}

export const h1 = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '52px',
  lineHeight: '0.92',
  fontWeight: 400 as const,
  color: '#090909',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
  letterSpacing: '0.5px',
}

export const text = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '16px',
  color: '#090909',
  lineHeight: '1.5',
  margin: '0 0 20px',
  fontWeight: 400 as const,
}

export const link = {
  color: '#090909',
  textDecoration: 'underline',
  fontWeight: 600 as const,
}

// botão com gradiente perestroika; fallback sólido laranja pra clientes legados
export const button = {
  backgroundColor: '#fe7b02',
  backgroundImage:
    'linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)',
  color: '#ffffff',
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '14px',
  fontWeight: 700 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  borderRadius: '12px',
  padding: '16px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '4px 0 28px',
}

export const codeStyle = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '56px',
  fontWeight: 400 as const,
  color: '#fd4644',
  letterSpacing: '12px',
  margin: '8px 0 28px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '20px 16px',
}

// barra de gradiente decorativa (substitui a lagrima)
export const accentBar = {
  height: '4px',
  width: '64px',
  backgroundImage:
    'linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)',
  borderRadius: '4px',
  margin: '28px 0 16px',
  border: 'none',
}

export const footer = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '12px',
  color: '#090909',
  opacity: 0.7,
  margin: '16px 0 0',
  lineHeight: '1.6',
}

export const fontImport = `@import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Urbanist:wght@400;600;700&display=swap');`

// footer padrão reutilizável como string
export const FOOTER_LINE_1 = 'vai lá e cria.'
export const FOOTER_LINE_2 = 'nachesu · uma plataforma naches · em parceria com escola sebrae'
