/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  sentAt?: string
}

const TestEmail = ({ sentAt }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>teste de envio nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>
          <Text style={badgeText}>nachesu · teste</Text>
        </Section>
        <Heading style={h1}>chegou.</Heading>
        <Text style={text}>
          se você tá lendo isso, a config de email do nachesu tá funcionando de ponta a ponta.
        </Text>
        <Text style={meta}>enviado em {sentAt ?? 'agora'}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: 'teste nachesu · email chegou',
  displayName: 'test email',
  previewData: { sentAt: 'agora' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Urbanist, Arial, sans-serif',
  color: '#090909',
}
const container = { padding: '40px 32px', maxWidth: '560px' }
const badge = { marginBottom: '24px' }
const badgeText = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#1E2BB8',
  color: '#ffffff',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'lowercase' as const,
  borderRadius: '999px',
  margin: 0,
}
const h1 = {
  fontFamily: 'League Gothic, Impact, sans-serif',
  fontSize: '56px',
  lineHeight: '1',
  margin: '0 0 16px 0',
  color: '#090909',
  textTransform: 'lowercase' as const,
}
const text = { fontSize: '17px', lineHeight: '1.5', color: '#090909', margin: '0 0 24px 0' }
const meta = { fontSize: '13px', color: '#6b6b6b', margin: 0 }
