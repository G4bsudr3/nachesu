/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  resetUrl?: string
}

const PasswordResetEmail = ({
  recipientName = '',
  resetUrl = 'https://sebrae.frattz.com/reset-password',
}: Props) => (
  <Html lang="pt-br" dir="ltr">
    <Head />
    <Preview>criar uma nova senha na nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>nachesu · escola sebrae</Text>
        <Heading style={h1}>criar uma nova senha</Heading>

        <Text style={text}>
          {recipientName ? `oi ${recipientName.toLowerCase()}, ` : 'oi, '}
          clica no botão abaixo pra definir uma senha nova e voltar pra plataforma.
        </Text>

        <Section style={ctaSection}>
          <Link href={resetUrl} style={ctaButton}>definir nova senha</Link>
        </Section>

        <Text style={textMuted}>
          o link é único e vale por 1 hora. se expirar, peça outro em{' '}
          <Link href="https://sebrae.frattz.com/auth" style={inlineLink}>sebrae.frattz.com/auth</Link>.
        </Text>
        <Text style={textMuted}>
          se você não pediu, pode ignorar esse email. sua senha atual continua valendo.
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
  component: PasswordResetEmail,
  subject: 'criar uma nova senha na nachesu',
  displayName: 'Recuperação de senha',
  previewData: {
    recipientName: 'Maria',
    resetUrl: 'https://sebrae.frattz.com/reset-password',
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
  backgroundColor: '#1E2BB8',
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
