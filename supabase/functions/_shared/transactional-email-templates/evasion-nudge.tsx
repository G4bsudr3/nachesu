import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface EvasionNudgeProps {
  recipientName?: string
  courseTitle?: string
  educatorName?: string
  level?: 'medium' | 'high' | 'lost'
  daysInactive?: number
  resumeUrl?: string
}

const COPY = {
  medium: {
    preview: 'só passei pra ver como você tá.',
    heading: 'tô por aqui.',
    intro: (name?: string, days?: number) =>
      `oi${name ? `, ${name.toLowerCase()}` : ''}. faz ${days ?? 'uns'} dias que você não aparece na eletiva. nada de grave, só queria saber se tá tudo bem.`,
    body: (course?: string) =>
      `se você precisa só de uns minutos pra retomar o ritmo, abre lá. ${course ? `tem coisa nova esperando você em ${course}.` : 'tem coisa nova esperando.'}`,
    cta: 'voltar pra eletiva',
    sign: 'até já',
  },
  high: {
    preview: 'senti tua falta na eletiva.',
    heading: 'cadê você?',
    intro: (name?: string, days?: number) =>
      `oi${name ? `, ${name.toLowerCase()}` : ''}. já faz ${days ?? 'umas'} duas semanas. se tem alguma coisa atrapalhando, me conta, a gente acha um jeito.`,
    body: (course?: string) =>
      `não precisa correr atrás de tudo de uma vez. abre o próximo módulo${course ? ` de ${course}` : ''}, faz 10 minutos, e a gente segue daí.`,
    cta: 'retomar de onde parei',
    sign: 'tô junto',
  },
  lost: {
    preview: 'antes que você desista.',
    heading: 'última chamada.',
    intro: (name?: string, days?: number) =>
      `oi${name ? `, ${name.toLowerCase()}` : ''}. três semanas sem aparecer. tô te escrevendo direto porque não quero te perder dessa eletiva.`,
    body: (course?: string) =>
      `me responde esse e-mail dizendo o que tá pegando, mesmo que seja "perdi o gás". ${course ? `${course} continua aqui esperando.` : 'a eletiva continua aqui esperando.'}`,
    cta: 'voltar agora',
    sign: 'a gente recomeça quando você puder',
  },
} as const

const EvasionNudgeEmail = ({
  recipientName,
  courseTitle,
  educatorName = 'frattz',
  level = 'medium',
  daysInactive,
  resumeUrl = 'https://nachesu.lovable.app/app',
}: EvasionNudgeProps) => {
  const copy = COPY[level] ?? COPY.medium

  return (
    <Html lang="pt-br" dir="ltr">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{copy.heading}</Heading>

          <Text style={text}>{copy.intro(recipientName, daysInactive)}</Text>

          <Text style={text}>{copy.body(courseTitle)}</Text>

          <Section style={ctaSection}>
            <Link href={resumeUrl} style={ctaButton}>
              {copy.cta}
            </Link>
          </Section>

          <Hr style={divider} />

          <Text style={textMuted}>{copy.sign},</Text>
          <Text style={signature}>{educatorName.toLowerCase()}</Text>
          <Text style={textMutedSmall}>educador da eletiva</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EvasionNudgeEmail,
  subject: (data: Record<string, any>) => {
    const lvl = (data?.level as string) || 'medium'
    if (lvl === 'lost') return 'antes que você desista da eletiva.'
    if (lvl === 'high') return 'cadê você na eletiva?'
    return 'só passei pra ver como você tá.'
  },
  displayName: 'Evasão · cutucada do educador',
  previewData: {
    recipientName: 'Frattz',
    courseTitle: 'IA na Prática',
    educatorName: 'frattz',
    level: 'medium',
    daysInactive: 9,
    resumeUrl: 'https://nachesu.lovable.app/app',
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
  maxWidth: '560px',
  margin: '0 auto',
}

const h1 = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '56px',
  lineHeight: '0.95',
  fontWeight: 400 as const,
  color: '#090909',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
  letterSpacing: '0.5px',
}

const text = {
  fontFamily: "'Urbanist', Arial, sans-serif",
  fontSize: '17px',
  color: '#090909',
  lineHeight: '1.55',
  margin: '0 0 18px',
  fontWeight: 400 as const,
}

const textMuted = {
  ...text,
  color: 'rgba(9,9,9,0.65)',
  fontSize: '14px',
  margin: '0 0 4px',
}

const textMutedSmall = {
  ...textMuted,
  fontSize: '12px',
}

const divider = {
  border: 'none',
  borderTop: '1px solid rgba(9,9,9,0.15)',
  margin: '28px 0 20px',
}

const ctaSection = {
  margin: '28px 0 8px',
  textAlign: 'center' as const,
}

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#090909',
  color: '#f2e4d8',
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '20px',
  letterSpacing: '0.8px',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  padding: '14px 28px',
  borderRadius: '999px',
}

const signature = {
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '28px',
  color: '#fd4644',
  textTransform: 'lowercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 2px',
}
