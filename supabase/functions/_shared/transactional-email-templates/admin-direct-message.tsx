import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  authorName?: string
  subject?: string
  bodyMd?: string
  link?: string
}

// renderiza markdown leve: parágrafos por linha em branco, **bold**, *itálico*, [txt](url)
const renderMd = (md: string) => {
  const blocks = md.split(/\n{2,}/)
  return blocks.map((block, i) => {
    const parts: React.ReactNode[] = []
    let cursor = 0
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(block)) !== null) {
      if (m.index > cursor) parts.push(block.slice(cursor, m.index))
      if (m[1]) parts.push(<strong key={`b-${i}-${m.index}`}>{m[1]}</strong>)
      else if (m[2]) parts.push(<em key={`i-${i}-${m.index}`}>{m[2]}</em>)
      else if (m[3] && m[4]) parts.push(
        <Link key={`a-${i}-${m.index}`} href={m[4]} style={inlineLink}>{m[3]}</Link>,
      )
      cursor = m.index + m[0].length
    }
    if (cursor < block.length) parts.push(block.slice(cursor))
    return <Text key={i} style={text}>{parts}</Text>
  })
}

const AdminMessageEmail = ({
  recipientName, authorName = 'frattz', subject = '', bodyMd = '', link,
}: Props) => (
  <Html lang="pt-br" dir="ltr">
    <Head />
    <Preview>{subject || `${authorName} te mandou uma mensagem`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>{authorName.toLowerCase()} · NachesU</Text>
        <Heading style={h1}>{subject}</Heading>

        {recipientName && (
          <Text style={text}>oi {recipientName.toLowerCase()},</Text>
        )}

        {renderMd(bodyMd)}

        {link && (
          <Section style={ctaSection}>
            <Link href={link} style={ctaButton}>abrir na plataforma</Link>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={textMuted}>se quiser responder, é só responder esse e-mail.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminMessageEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject as string) || 'mensagem do educador',
  displayName: 'Educador · mensagem direta',
  previewData: {
    recipientName: 'Frattz',
    authorName: 'frattz',
    subject: 'um toque rápido sobre sua entrega',
    bodyMd: 'só queria te dizer que **gostei muito** do recorte que você fez.\n\nme conta na próxima entrega como foi testar com gente de fora.',
    link: 'https://nachesu.lovable.app/app',
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
  padding: '36px 32px',
  maxWidth: '560px',
  margin: '0 auto',
}
const kicker = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '12px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: 'rgba(9,9,9,0.55)',
  margin: '0 0 12px',
}
const h1 = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '40px',
  lineHeight: '1.05',
  fontWeight: 400 as const,
  color: '#090909',
  textTransform: 'lowercase' as const,
  margin: '0 0 22px',
}
const text = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '16px',
  color: '#090909',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const textMuted = { ...text, color: 'rgba(9,9,9,0.6)', fontSize: '13px', margin: '0' }
const divider = {
  border: 'none', borderTop: '1px solid rgba(9,9,9,0.15)', margin: '28px 0 20px',
}
const ctaSection = { margin: '24px 0 8px', textAlign: 'center' as const }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#090909',
  color: '#f2e4d8',
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '18px',
  letterSpacing: '0.8px',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  padding: '13px 26px',
  borderRadius: '999px',
}
const inlineLink = { color: '#1E2BB8', textDecoration: 'underline' }
