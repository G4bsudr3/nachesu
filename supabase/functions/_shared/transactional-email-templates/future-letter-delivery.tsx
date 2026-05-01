import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Chŏra Lovable'
const LAGRIMA_URL =
  'https://tfztafpdhlcaamumcdrn.supabase.co/storage/v1/object/public/email-assets/lagrima.png'

interface FutureLetterProps {
  recipientName?: string
  groupMembers?: string[]
  letterText?: string
  sealedAtLabel?: string
  sessionTitle?: string
}

const FutureLetterEmail = ({
  recipientName,
  groupMembers = [],
  letterText = '',
  sealedAtLabel,
  sessionTitle,
}: FutureLetterProps) => {
  const greeting = recipientName ? `oi, ${recipientName.toLowerCase()}.` : 'oi.'
  const memberList = groupMembers.length > 0 ? groupMembers.join(', ') : 'vocês'

  return (
    <Html lang="pt-br" dir="ltr">
      <Head />
      <Preview>uma carta de vocês, pra vocês — escrita no {SITE_NAME}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LAGRIMA_URL} alt="" width={48} height={64} style={lagrima} />

          <Heading style={h1}>uma carta do passado.</Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            {sealedAtLabel ? `em ${sealedAtLabel}, ` : ''}vocês selaram essa carta juntos no {SITE_NAME}
            {sessionTitle ? ` durante ${sessionTitle}` : ''}.
          </Text>

          <Text style={textMuted}>
            o grupo era: <strong style={{ color: '#090909' }}>{memberList}</strong>.
          </Text>

          <Hr style={divider} />

          <Section style={letterBox}>
            <Text style={letterTextStyle}>{letterText}</Text>
          </Section>

          <Hr style={divider} />

          <Text style={textMuted}>
            esse email foi disparado automaticamente na data que vocês marcaram.
          </Text>

          <Text style={signature}>vai lá e cria. de novo.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FutureLetterEmail,
  subject: 'uma carta do passado pro futuro de vocês',
  displayName: 'Carta pro Futuro · entrega',
  previewData: {
    recipientName: 'Frattz',
    groupMembers: ['frattz', 'helena', 'fernanda'],
    letterText:
      'oi, gente do futuro.\n\nse vocês estão lendo isso, é porque a aposta deu certo, pelo menos um pouco. lembrem do que prometeram aqui no Caldeira: criar antes de ter certeza, publicar antes de ficar perfeito, e voltar a se encontrar pra ver no que deu.\n\nvai lá e cria.',
    sealedAtLabel: '26 de abril de 2026',
    sessionTitle: 'Chŏra Lovable 2026',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Urbanist', Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}

const container = {
  backgroundColor: '#f2e4d8',
  borderRadius: '24px',
  padding: '40px 32px 32px',
  maxWidth: '600px',
  margin: '0 auto',
}

const lagrima = {
  display: 'block',
  margin: '0 0 24px',
}

const h1 = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '52px',
  lineHeight: '0.95',
  fontWeight: 400 as const,
  color: '#090909',
  textTransform: 'uppercase' as const,
  margin: '0 0 28px',
  letterSpacing: '0.5px',
}

const text = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '16px',
  color: '#090909',
  lineHeight: '1.55',
  margin: '0 0 18px',
  fontWeight: 400 as const,
}

const textMuted = {
  ...text,
  color: 'rgba(9,9,9,0.65)',
  fontSize: '14px',
}

const divider = {
  border: 'none',
  borderTop: '1px solid rgba(9,9,9,0.15)',
  margin: '24px 0',
}

const letterBox = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '28px 24px',
  border: '1px solid rgba(9,9,9,0.08)',
}

const letterTextStyle = {
  fontFamily: "'Urbanist', Georgia, serif",
  fontSize: '16px',
  color: '#090909',
  lineHeight: '1.7',
  whiteSpace: 'pre-wrap' as const,
  fontStyle: 'italic' as const,
  margin: 0,
}

const signature = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '24px',
  color: '#fd4644',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '32px 0 0',
}
