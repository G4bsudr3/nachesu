import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  studentLabel?: string
  category?: string
  severity?: string
  redactedMessage?: string
  trailTitle?: string
  occurredAt?: string
  adminUrl?: string
  slaHours?: number
}

const CATEGORY_LABEL: Record<string, string> = {
  self_harm: 'sinal de risco a si mesmo',
  abuse: 'sinal de abuso ou violência',
  illegal: 'tema ilegal',
  hate: 'discurso de ódio',
  other_serious: 'outro tema sensível',
}

const TutorSafetyAlertEmail = ({
  studentLabel = 'estudante anonimizado',
  category = 'other_serious',
  severity = 'high',
  redactedMessage = '(mensagem anonimizada indisponível)',
  trailTitle = 'tutor ia',
  occurredAt = new Date().toISOString(),
  adminUrl = 'https://nachesu.lovable.app/admin/tutor',
  slaHours = 2,
}: Props) => {
  const niceCategory = CATEGORY_LABEL[category] ?? category
  const niceTime = new Date(occurredAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>alerta de segurança no tutor ia · resposta esperada em {slaHours}h</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={alertBar}>
            <Text style={alertBarText}>alerta de segurança · tutor ia</Text>
          </Section>

          <Heading style={h1}>um estudante precisa de atenção</Heading>

          <Text style={text}>
            o tutor ia detectou um <strong>{niceCategory}</strong> numa
            conversa em <strong>{trailTitle}</strong>. severidade:{' '}
            <strong>{severity}</strong>.
          </Text>

          <Text style={text}>
            por privacidade, o nome do estudante não vai por email. abre o
            painel pra ver quem é, dar ciência e registrar o que foi feito.
          </Text>

          <Section style={metaBox}>
            <Text style={metaLine}><strong>quando:</strong> {niceTime}</Text>
            <Text style={metaLine}><strong>identificador:</strong> {studentLabel}</Text>
            <Text style={metaLine}><strong>sla de resposta:</strong> {slaHours}h</Text>
          </Section>

          <Heading style={h2}>trecho anonimizado da mensagem</Heading>
          <Section style={quoteBox}>
            <Text style={quoteText}>{redactedMessage}</Text>
          </Section>
          <Text style={textSmall}>
            nomes próprios, contatos e dados pessoais foram removidos
            automaticamente antes deste envio.
          </Text>

          <Hr style={hr} />

          <Heading style={h2}>o que fazer agora</Heading>
          <Text style={text}>
            1. abre o painel e marca <strong>ciência</strong> pra registrar que viu.<br />
            2. fala com o estudante em até <strong>{slaHours}h</strong>.<br />
            3. registra no painel o que foi feito (acolhimento, encaminhamento, escalação pra coordenação).<br />
            4. se for risco imediato à vida, aciona o protocolo da escola e o CVV (188).
          </Text>

          <Section style={ctaBox}>
            <Link href={adminUrl} style={ctaButton}>abrir painel do tutor</Link>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            este email é gerado automaticamente pelo sistema de proteção do
            tutor ia da nachesu. ele existe pra garantir que nenhum sinal
            importante passe despercebido.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TutorSafetyAlertEmail,
  subject: (d: Record<string, any>) =>
    `[alerta tutor ia] ${CATEGORY_LABEL[d?.category as string] ?? 'tema sensível'} · resposta em ${d?.slaHours ?? 2}h`,
  displayName: 'tutor ia · alerta de segurança',
  previewData: {
    studentLabel: 'estudante #a3f1',
    category: 'self_harm',
    severity: 'high',
    redactedMessage: 'às vezes eu queria sumir, [REDACTED_NAME] disse que…',
    trailTitle: 'ia na prática · fundamentos',
    occurredAt: new Date().toISOString(),
    adminUrl: 'https://nachesu.lovable.app/admin/tutor',
    slaHours: 2,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Urbanist, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const alertBar = {
  backgroundColor: '#fd4644',
  borderRadius: '8px',
  padding: '10px 14px',
  marginBottom: '20px',
}
const alertBarText = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700 as const,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: 0,
}
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#090909', margin: '0 0 16px', lineHeight: '1.2' }
const h2 = { fontSize: '15px', fontWeight: 700 as const, color: '#090909', margin: '24px 0 10px', textTransform: 'lowercase' as const }
const text = { fontSize: '15px', color: '#2a2a2a', lineHeight: '1.55', margin: '0 0 14px' }
const textSmall = { fontSize: '12px', color: '#6b6b6b', lineHeight: '1.4', margin: '6px 0 0' }
const metaBox = {
  backgroundColor: '#f2e4d8',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '16px 0',
}
const metaLine = { fontSize: '13px', color: '#2a2a2a', margin: '2px 0' }
const quoteBox = {
  backgroundColor: '#f5f3ee',
  borderLeft: '3px solid #fd4644',
  borderRadius: '4px',
  padding: '12px 14px',
  margin: '8px 0',
}
const quoteText = { fontSize: '14px', color: '#2a2a2a', fontStyle: 'italic' as const, lineHeight: '1.5', margin: 0 }
const ctaBox = { textAlign: 'center' as const, margin: '20px 0' }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#090909',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600 as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
const footer = { fontSize: '11px', color: '#999999', lineHeight: '1.5', margin: '20px 0 0' }
