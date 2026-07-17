import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  invitedBy?: string
  roleLabel?: string
  courses?: string[]
  loginUrl?: string
}

const AdminInviteEmail = ({
  recipientName = 'oi',
  invitedBy = 'a equipe da nachesu',
  roleLabel = 'estudante',
  courses = [],
  loginUrl = 'https://sebrae.frattz.com/app',
}: Props) => (
  <Html lang="pt-br" dir="ltr">
    <Head />
    <Preview>seu acesso à nachesu tá liberado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>nachesu · escola sebrae</Text>
        <Heading style={h1}>você foi convidado pra nachesu</Heading>

        <Text style={text}>
          oi {recipientName.toLowerCase()}, {invitedBy.toLowerCase()} te deu acesso à nachesu como{' '}
          <strong>{roleLabel.toLowerCase()}</strong>.
        </Text>

        {courses.length > 0 && (
          <Text style={text}>
            você já tá matriculado em: <strong>{courses.map((c) => c.toLowerCase()).join(' e ')}</strong>.
          </Text>
        )}

        <Text style={text}>
          clica no botão pra entrar direto, sem precisar de senha.
        </Text>

        <Section style={ctaSection}>
          <Link href={loginUrl} style={ctaButton}>entrar na nachesu</Link>
        </Section>

        <Text style={textMuted}>
          o link é único e vale por 1 hora. se expirar, é só ir em{' '}
          <Link href="https://sebrae.frattz.com/auth" style={inlineLink}>sebrae.frattz.com/auth</Link>{' '}
          e pedir um novo link mágico com esse mesmo email.
        </Text>

        <Hr style={divider} />
        <Text style={textMuted}>
          nachesu é uma plataforma naches, em parceria com a escola sebrae bh. vai lá e cria.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminInviteEmail,
  subject: 'você foi convidado pra nachesu',
  displayName: 'Convite de acesso (admin)',
  previewData: {
    recipientName: 'Maria',
    invitedBy: 'frattz',
    roleLabel: 'estudante',
    courses: ['IA na Prática'],
    loginUrl: 'https://sebrae.frattz.com/app',
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
const textMuted = { ...text, color: 'rgba(9,9,9,0.6)', fontSize: '13px', margin: '0 0 8px' }
const divider = {
  border: 'none', borderTop: '1px solid rgba(9,9,9,0.15)', margin: '28px 0 20px',
}
const ctaSection = { margin: '24px 0 20px', textAlign: 'center' as const }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#fd4644',
  color: '#ffffff',
  fontFamily: "'League Gothic', 'Arial Black', Arial, sans-serif",
  fontSize: '20px',
  letterSpacing: '0.8px',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  padding: '14px 28px',
  borderRadius: '999px',
}
const inlineLink = { color: '#1E2BB8', textDecoration: 'underline' }
