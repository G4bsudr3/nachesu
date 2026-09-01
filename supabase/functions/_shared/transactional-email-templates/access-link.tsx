/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  loginUrl?: string
}

const AccessLinkEmail = ({
  recipientName = '',
  loginUrl = 'https://sebrae.frattz.com/app',
}: Props) => (
  <Html lang="pt-br" dir="ltr">
    <Head />
    <Preview>seu link de acesso à nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>nachesu · escola sebrae</Text>
        <Heading style={h1}>seu link de acesso chegou</Heading>

        <Text style={text}>
          {recipientName ? `oi ${recipientName.toLowerCase()}, ` : 'oi, '}
          é só clicar no botão abaixo pra entrar na plataforma. sem senha, sem código.
        </Text>

        <Section style={ctaSection}>
          <Link href={loginUrl} style={ctaButton}>entrar na nachesu</Link>
        </Section>

        <Text style={textMuted}>
          o link é único, vale por 1 hora e só funciona uma vez. se você pediu mais de um, abre
          sempre o email mais recente. se expirar, peça um novo em{' '}
          <Link href="https://sebrae.frattz.com/auth" style={inlineLink}>sebrae.frattz.com/auth</Link>.
        </Text>

        <Text style={textMuted}>
          se você não pediu esse acesso, pode ignorar esse email.
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
  component: AccessLinkEmail,
  subject: 'seu link de acesso à nachesu',
  displayName: 'Link de acesso (magic link)',
  previewData: {
    recipientName: 'Maria',
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
