import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  educatorName?: string
  courseTitle?: string
  moduleNumber?: number | string
  moduleTitle?: string
  feedbackExcerpt?: string
  verdict?: 'aprovado' | 'ajustar' | string
  link?: string
}

const DeliverableReviewedEmail = ({
  recipientName,
  educatorName = 'seu educador',
  courseTitle = 'sua eletiva',
  moduleNumber,
  moduleTitle,
  feedbackExcerpt = '',
  verdict = 'aprovado',
  link = 'https://nachesu.lovable.app/app',
}: Props) => {
  const isAjuste = verdict === 'ajustar'
  const heading = isAjuste ? 'seu educador pediu um ajuste' : 'seu educador respondeu'
  return (
    <Html lang="pt-br" dir="ltr">
      <Head />
      <Preview>
        {`${heading} no módulo ${moduleNumber ?? ''} de ${courseTitle}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>nachesu · {courseTitle.toLowerCase()}</Text>
          <Heading style={h1}>{heading}</Heading>

          {recipientName && (
            <Text style={text}>oi {recipientName.toLowerCase()},</Text>
          )}

          <Text style={text}>
            {educatorName.toLowerCase()} olhou sua entrega do{' '}
            <strong>
              módulo {moduleNumber ?? '?'}
              {moduleTitle ? `: ${moduleTitle.toLowerCase()}` : ''}
            </strong>
            .
          </Text>

          {feedbackExcerpt && (
            <Section style={quote}>
              <Text style={quoteText}>{feedbackExcerpt}</Text>
            </Section>
          )}

          <Text style={text}>
            {isAjuste
              ? 'dá uma olhada no que ele apontou, ajusta e reenvia. nada de tela vermelha, é só mais uma volta.'
              : 'abre a plataforma pra ler o feedback completo.'}
          </Text>

          <Section style={ctaSection}>
            <Link href={link} style={ctaButton}>
              {isAjuste ? 'ver o ajuste' : 'ler o feedback'}
            </Link>
          </Section>

          <Hr style={divider} />
          <Text style={textMuted}>
            se quiser conversar, é só responder esse e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DeliverableReviewedEmail,
  subject: (data: Record<string, any>) =>
    data?.verdict === 'ajustar'
      ? `ajuste pedido no módulo ${data?.moduleNumber ?? ''}`.trim()
      : `feedback no módulo ${data?.moduleNumber ?? ''}`.trim(),
  displayName: 'Entrega · feedback do educador',
  previewData: {
    recipientName: 'Hey',
    educatorName: 'frattz',
    courseTitle: 'IA na Prática',
    moduleNumber: 3,
    moduleTitle: 'quando a ia inventa',
    feedbackExcerpt:
      'gostei do jeito que você conferiu a fonte antes de aceitar a resposta. no próximo, escreve também o que você faria se não achasse fonte nenhuma.',
    verdict: 'aprovado',
    link: 'https://nachesu.lovable.app/app/eletiva/ia-na-pratica/modulo/3#feedback-do-educador',
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
const quote = {
  borderLeft: '3px solid #f756a6',
  padding: '4px 0 4px 14px',
  margin: '0 0 18px',
}
const quoteText = { ...text, margin: 0, fontStyle: 'italic' as const }
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
